"use server";

import { safeRevalidatePath } from '@/lib/utils';
import { formatActionError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { DirectDealSchema } from '@/lib/validations/purchases';
import { getStationLocation, logStockMovement } from '@/lib/stock-service';
import { WarehouseType } from '@prisma/client';

/**
 * Concurrency-safe, collision-free Deal ID generator
 */
export async function generateDealId(tx: any, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(100 + Math.random() * 900);
  let dealId = `DEAL-${year}-${timestamp}${random}`;

  while (await tx.directPurchaseDeal.findUnique({ where: { dealId } })) {
    const newRandom = Math.floor(100 + Math.random() * 900);
    dealId = `DEAL-${year}-${Date.now().toString().slice(-4)}${newRandom}`;
  }
  return dealId;
}

/**
 * Concurrency-safe, collision-free Direct FG Batch ID generator
 */
export async function generateDirectFgBatchId(tx: any, date: Date = new Date()): Promise<string> {
  const dateStr = date.toISOString().substring(0, 10).replace(/-/g, '');
  const random = Math.floor(10 + Math.random() * 90);
  let fgBatchId = `FG-DIR-${dateStr}-${random}`;

  while (await tx.finishedGoodsBatch.findUnique({ where: { fgBatchId } })) {
    const newRandom = Math.floor(10 + Math.random() * 90);
    fgBatchId = `FG-DIR-${dateStr}-${newRandom}`;
  }
  return fgBatchId;
}

export async function addDirectPurchaseDeal(payload: unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'CREATE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بقيد صفقات' };
  }

  const validated = DirectDealSchema.safeParse(payload);
  if (!validated.success) {
    return {
      success: false,
      error: 'بيانات الصفقة غير صحيحة',
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const data = validated.data;
  const totalCost = data.qtyKg * data.purchasePricePerKg + (data.transportCost || 0);
  const costPerKg = totalCost / data.qtyKg;
  const dDate = data.date ? new Date(data.date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 0. Idempotency Check by submissionId to prevent duplicate deals on double clicks
      if (data.submissionId) {
        const existingDeal = await tx.directPurchaseDeal.findFirst({
          where: {
            supplierId: data.supplierId,
            stationId: data.stationId,
            notes: { contains: `[SUB:${data.submissionId}]` },
          },
        });

        if (existingDeal) {
          return {
            dealId: existingDeal.dealId,
            fgBatchId: existingDeal.generatedBatchId || '',
            totalCost: Number(existingDeal.totalCost),
            paidAmount: 0,
            supplierId: existingDeal.supplierId,
            isExisting: true,
          };
        }
      }

      // 1. Resolve and verify Product against Product catalog
      const product = await tx.product.findFirst({
        where: {
          OR: [
            { id: (data as any).productId || '' },
            { name: data.productName },
            { code: data.productName },
          ],
        },
      });

      if (!product) {
        throw new Error(`المنتج "${data.productName}" غير مسجل بكتالوج المنتجات الرئيسي. يرجى اختيار صنف معتمد.`);
      }
      const canonicalProductName = product.name;

      // 2. Validate Station & Resolve FINISHED StockLocation
      const station = await tx.station.findUnique({ where: { id: data.stationId } });
      if (!station || !station.isActive) {
        throw new Error(`المحطة المحددة (${data.stationId}) غير موجودة أو غير نشطة`);
      }

      const fgLocation = await getStationLocation(tx, data.stationId, WarehouseType.FINISHED);
      if (!fgLocation || fgLocation.stationId !== data.stationId || fgLocation.type !== WarehouseType.FINISHED) {
        throw new Error('مخزن المنتج التام الخاص بالمحطة غير موجود أو غير مرتبط بالمحطة');
      }

      // 3. Concurrency-safe, collision-free ID generation
      const dealId = await generateDealId(tx, dDate);
      const fgBatchId = await generateDirectFgBatchId(tx, dDate);

      // 4. Verify Supplier
      const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) throw new Error(`المورد المحدد (${data.supplierId}) غير موجود`);
      if (supplier.status !== 'معتمد') throw new Error(`المورد (${supplier.name}) غير معتمد حالياً`);

      // 5. Create DirectPurchaseDeal record
      const notesWithSub = data.submissionId
        ? `${data.notes || ''} [SUB:${data.submissionId}]`.trim()
        : data.notes;

      await tx.directPurchaseDeal.create({
        data: {
          dealId,
          date: dDate,
          supplierId: data.supplierId,
          productName: canonicalProductName,
          stationId: data.stationId,
          qtyKg: data.qtyKg,
          packageType: data.packageType,
          packageCount: data.packageCount,
          purchasePricePerKg: data.purchasePricePerKg,
          transportCost: data.transportCost || 0,
          totalCost,
          costPerKg,
          generatedBatchId: fgBatchId,
          invoiceNo: data.invoiceNo,
          notes: notesWithSub,
        },
      });

      // 6. Create FinishedGoodsBatch linked to fgLocation.id
      await tx.finishedGoodsBatch.create({
        data: {
          fgBatchId,
          sourceType: 'DIRECT_PURCHASE',
          dealRef: dealId,
          stationId: data.stationId,
          locationId: fgLocation.id,
          productName: canonicalProductName,
          productionDate: dDate,
          initialQty: data.qtyKg,
          availableQty: data.qtyKg,
          costPerKg,
          totalValue: totalCost,
          suppliersSummary: [{ supplierName: supplier.name, sharePct: 100 }],
          createdById: user.id,
        },
      });

      // 7. Log StockMovement entry (Finished goods IN)
      await logStockMovement(tx, {
        movementType: 'PURCHASE',
        sourceLocationId: null,
        destinationLocationId: fgLocation.id,
        itemType: WarehouseType.FINISHED,
        fgBatchId,
        qty: data.qtyKg,
        unit: 'KG',
        referenceType: 'DIRECT_PURCHASE',
        referenceId: dealId,
        notes: `صفقة شراء بضاعة جاهزة من المورد (${supplier.name})`,
        createdById: user.id,
      });

      // 8. AP Financial Transaction via AccountingService (Purchase Accrual)
      const { AccountingService } = await import('@/lib/accounting/accounting-service');
      await AccountingService.recordTransaction(
        {
          date: dDate,
          type: 'استحقاق شراء صفقة جاهزة (AP)',
          partyType: 'مورد جاهز',
          partyId: data.supplierId,
          partyName: supplier.name,
          amountEgp: totalCost,
          currency: 'EGP',
          relatedEntityType: 'PURCHASE_DEAL',
          relatedEntityId: dealId,
          refDoc: dealId,
          paymentMethod: 'CREDIT',
          description: `استحقاق شراء صفقة بضاعة جاهزة ${data.qtyKg.toLocaleString()} كجم ${canonicalProductName} بالباتش ${fgBatchId}`,
          createdById: user.id,
        },
        tx
      );

      // 9. Instant Payment Handling (if user paid on spot from a treasury account)
      const paidAmount = data.paidAmount || 0;
      if (paidAmount > 0 && data.treasuryAccountId) {
        await AccountingService.recordTransaction(
          {
            date: dDate,
            type: 'سداد لمورد جاهز',
            partyType: 'مورد جاهز',
            partyId: data.supplierId,
            partyName: supplier.name,
            amountEgp: paidAmount,
            currency: 'EGP',
            accountId: data.treasuryAccountId,
            relatedEntityType: 'PURCHASE_DEAL',
            relatedEntityId: dealId,
            refDoc: dealId,
            paymentMethod: 'CASH',
            description: `سداد فوري عن صفقة شراء بضاعة جاهزة ${dealId} بالباتش ${fgBatchId}`,
            createdById: user.id,
          },
          tx
        );
      }

      return {
        dealId,
        fgBatchId,
        totalCost,
        paidAmount,
        supplierId: data.supplierId,
        treasuryAccountId: data.treasuryAccountId,
        isExisting: false,
      };
    }, {
      timeout: 25000,
      maxWait: 15000,
    });

    const { revalidateFinancialImpact } = await import('@/actions/financials');
    await revalidateFinancialImpact('مورد جاهز', result.supplierId);
    if (result.treasuryAccountId) {
      safeRevalidatePath('/financials/treasury');
    }
    safeRevalidatePath('/finished-purchases');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/suppliers');
    safeRevalidatePath(`/suppliers/${result.supplierId}`);

    const payMsg = result.paidAmount > 0
      ? ` وتم سداد ${result.paidAmount.toLocaleString()} ج.م فورياً من الخزينة`
      : '';

    return {
      success: true,
      message: result.isExisting
        ? `الصفقة مسجلة مسبقاً (${result.dealId})`
        : `تم قيد الصفقة ${result.dealId} بنجاح${payMsg} وتوليد رمز الباتش الجاهز ${result.fgBatchId} بمخزن المنتج التام!`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء قيد الصفقة') };
  }
}

export async function getProductsForDirectDealSelect() {
  try {
    return await prisma.product.findMany({
      select: { id: true, code: true, name: true, category: true, defaultUnit: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch products for direct deal select:', error);
    return [];
  }
}

export async function getDirectDeals() {
  try {
    return await prisma.directPurchaseDeal.findMany({
      include: {
        supplier: true,
        station: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  } catch (error) {
    console.error('Failed to fetch direct deals:', error);
    return [];
  }
}

export async function cancelDirectPurchaseDeal(dealId: string, cancelReason?: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'CREATE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بإلغاء صفقات' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch deal
      const deal = await tx.directPurchaseDeal.findUnique({
        where: { dealId },
        include: { supplier: true },
      });

      if (!deal) {
        throw new Error(`الصفقة ${dealId} غير موجودة`);
      }

      if (deal.status === 'ملغاة') {
        throw new Error(`الصفقة ${dealId} ملغاة بالفعل مسبقاً`);
      }

      // 2. Fetch associated FinishedGoodsBatch
      if (deal.generatedBatchId) {
        const fgBatch = await tx.finishedGoodsBatch.findUnique({
          where: { fgBatchId: deal.generatedBatchId },
          include: { allocatedShipments: true },
        });

        if (fgBatch) {
          // Check if batch was used or allocated
          if (fgBatch.allocatedShipments && fgBatch.allocatedShipments.length > 0) {
            throw new Error('لا يمكن إلغاء الصفقة لأن الدفعة مخصصة لشحنة تصدير بالفعل');
          }
          if (Number(fgBatch.availableQty) < Number(fgBatch.initialQty)) {
            throw new Error('لا يمكن إلغاء الصفقة لأن جزءاً من كمية الدفعة تم صرفه أو استخدامه');
          }

          // Zero out batch availability and mark as cancelled
          await tx.finishedGoodsBatch.update({
            where: { fgBatchId: fgBatch.fgBatchId },
            data: {
              availableQty: 0,
              qualityStatus: 'ملغاة',
            },
          });

          // Log reversal stock movement
          const fgLocation = await getStationLocation(tx, deal.stationId, WarehouseType.FINISHED);
          await logStockMovement(tx, {
            movementType: 'REVERSAL_OUT',
            sourceLocationId: fgLocation.id,
            destinationLocationId: null,
            itemType: WarehouseType.FINISHED,
            fgBatchId: fgBatch.fgBatchId,
            qty: Number(deal.qtyKg),
            unit: 'KG',
            referenceType: 'DIRECT_PURCHASE_REVERSAL',
            referenceId: deal.dealId,
            notes: `إلغاء صفقة بضاعة جاهزة ${deal.dealId}: ${cancelReason || 'بناء على طلب المستخدم'}`,
            createdById: user.id,
          });
        }
      }

      // 3. Reverse Financial Transactions
      const transactions = await tx.financialTransaction.findMany({
        where: {
          refDoc: deal.dealId,
          relatedEntityType: 'PURCHASE_DEAL',
          status: { not: 'ملغاة' },
        },
      });

      for (const txn of transactions) {
        // If it was a cash payment outflow from treasury, refund the money back to the account
        if (txn.accountId && (txn.type.includes('سداد') || txn.type.includes('منصرف') || txn.type.includes('Outflow'))) {
          await tx.treasuryAccount.update({
            where: { id: txn.accountId },
            data: {
              balance: { increment: txn.amountEgp },
            },
          });
        }

        await tx.financialTransaction.update({
          where: { txnId: txn.txnId },
          data: {
            status: 'ملغاة',
            description: `${txn.description || ''} (أُلغيت: ${cancelReason || 'إلغاء الصفقة'})`.trim(),
          },
        });
      }

      // 4. Update deal status
      await tx.directPurchaseDeal.update({
        where: { dealId: deal.dealId },
        data: {
          status: 'ملغاة',
          notes: `${deal.notes || ''} [ملغاة: ${cancelReason || 'إلغاء صفقة'}]`.trim(),
        },
      });

      return { dealId: deal.dealId, supplierId: deal.supplierId };
    }, {
      timeout: 25000,
      maxWait: 15000,
    });

    const { revalidateFinancialImpact } = await import('@/actions/financials');
    await revalidateFinancialImpact('مورد جاهز', result.supplierId);
    safeRevalidatePath('/finished-purchases');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/suppliers');
    safeRevalidatePath(`/suppliers/${result.supplierId}`);
    safeRevalidatePath('/financials/treasury');

    return {
      success: true,
      message: `تم إلغاء الصفقة ${result.dealId} بنجاح وإلغاء أثرها المخزني والمالي`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء إلغاء الصفقة') };
  }
}

export async function getFinishedGoodsSuppliersSelect() {
  try {
    return await prisma.supplier.findMany({
      where: { status: 'معتمد' },
      select: { id: true, code: true, name: true, type: true },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
  } catch (error) {
    console.error('Failed to fetch suppliers for finished goods:', error);
    return [];
  }
}

export async function getStationsForSelect() {
  try {
    return await prisma.station.findMany({
      where: { isActive: true },
      select: { id: true, name: true, location: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch stations for select:', error);
    return [];
  }
}

export async function getPackagingSuppliesSelect() {
  try {
    return await prisma.supply.findMany({
      select: { id: true, code: true, name: true, category: true, unit: true, capacityKg: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch packaging supplies for select:', error);
    return [];
  }
}

