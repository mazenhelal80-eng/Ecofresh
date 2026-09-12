"use server";

import { safeRevalidatePath } from '@/lib/utils';
import { formatActionError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { PackagingPurchaseSchema } from '@/lib/validations/purchases';
import { getStationLocation, updateStationSupplyStock, logStockMovement } from '@/lib/stock-service';
import { WarehouseType } from '@prisma/client';

export async function addPackagingPurchase(payload: unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'CREATE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بتسجيل مشتريات مستلزمات' };
  }

  const validated = PackagingPurchaseSchema.safeParse(payload);
  if (!validated.success) {
    return {
      success: false,
      error: 'بيانات شراء المستلزمات غير صحيحة',
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const data = validated.data;
  const totalCost = Number((data.qty * data.unitPrice).toFixed(4));
  const pDate = data.date ? new Date(data.date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve Target Station (Strict station isolation - no arbitrary findFirst fallback)
      if (!data.stationId) {
        throw new Error('يجب تحديد محطة التشغيل المستلمة للمستلزمات بدقة');
      }
      const station = await tx.station.findUnique({ where: { id: data.stationId } });
      if (!station || !station.isActive) {
        throw new Error(`المحطة المحددة (${data.stationId}) غير موجودة أو غير نشطة`);
      }
      const targetStationId = station.id;

      // 2. Resolve Supplier
      const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) {
        throw new Error(`المورد المحدد (${data.supplierId}) غير موجود`);
      }
      if (supplier.status !== 'معتمد') {
        throw new Error(`المورد (${supplier.name}) غير معتمد حالياً`);
      }

      // 3. Strict Pre-check: Prevent duplicate purchase or invoice
      const effectiveInvoiceNo = data.invoiceNo?.trim() || null;
      if (effectiveInvoiceNo) {
        const existingPurchase = await tx.packagingPurchase.findFirst({
          where: {
            supplierId: data.supplierId,
            invoiceNo: effectiveInvoiceNo,
          },
        });

        if (existingPurchase) {
          throw new Error(`فاتورة الشراء رقم (${effectiveInvoiceNo}) مسجلة مسبقاً لهذا المورد. لن يتم تكرار قيد الشراء أو زيادة المخزون.`);
        }
      }

      // 4. Submission-level Idempotency Check if submissionId is provided
      if (data.submissionId) {
        const existingBySub = await tx.packagingPurchase.findFirst({
          where: {
            supplierId: data.supplierId,
            supplyId: data.supplyId,
            stationId: targetStationId,
            invoiceNo: data.submissionId,
          },
        });
        if (existingBySub) {
          return {
            isExisting: true,
            totalCost: Number(existingBySub.totalCost),
            supplierId: data.supplierId,
          };
        }
      }

      // 5. Resolve and verify SUPPLIES StockLocation for target station
      const suppliesLocation = await getStationLocation(tx, targetStationId, WarehouseType.SUPPLIES);
      if (suppliesLocation.stationId !== targetStationId || suppliesLocation.type !== WarehouseType.SUPPLIES) {
        throw new Error('فشل التحقق من ارتباط مخزن المستلزمات بالمحطة المحددة');
      }

      // 6. Increment StationSupply stock
      const updatedStationSupply = await updateStationSupplyStock(
        tx,
        suppliesLocation.id,
        data.supplyId,
        data.qty
      );

      // Maintain catalog total for backward compatibility
      const supply = await tx.supply.update({
        where: { id: data.supplyId },
        data: { stock: { increment: data.qty } },
      });

      // Stable invoice reference
      const invoiceRef = effectiveInvoiceNo || (data.submissionId ? `SUP-PUR-${data.submissionId.slice(-6)}` : `SUP-PUR-${Date.now().toString().slice(-6)}`);

      // 7. Create PackagingPurchase record (exact decimal quantity)
      await tx.packagingPurchase.create({
        data: {
          stationId: targetStationId,
          supplyId: data.supplyId,
          supplierId: data.supplierId,
          qty: data.qty,
          unitPrice: data.unitPrice,
          totalCost,
          invoiceNo: effectiveInvoiceNo || (data.submissionId ? data.submissionId : invoiceRef),
        },
      });

      // 8. Log StockMovement audit entry (exact decimal quantity)
      await logStockMovement(tx, {
        movementType: 'PURCHASE',
        sourceLocationId: null,
        destinationLocationId: suppliesLocation.id,
        itemType: WarehouseType.SUPPLIES,
        supplyId: data.supplyId,
        qty: data.qty,
        unit: supply.unit,
        referenceType: 'PACKAGING_PURCHASE',
        referenceId: invoiceRef,
        notes: `شراء مستلزمات لمخزن المحطة (فاتورة: ${effectiveInvoiceNo || 'N/A'})`,
        createdById: user.id,
      });

      // 9. AP Financial Transaction via AccountingService
      const { AccountingService } = await import('@/lib/accounting/accounting-service');
      const txnResult = await AccountingService.recordTransaction(
        {
          date: pDate,
          type: 'استحقاق توريد مستلزمات (AP)',
          partyType: 'مورد مستلزمات',
          partyId: data.supplierId,
          partyName: supplier.name,
          amountEgp: totalCost,
          currency: 'EGP',
          relatedEntityType: 'PACKAGING_PURCHASE',
          relatedEntityId: invoiceRef,
          refDoc: invoiceRef,
          paymentMethod: 'CREDIT',
          description: `شراء ${data.qty} ${supply.unit} (${supply.name}) بسعر ${data.unitPrice} ج.م`,
          createdById: user.id,
        },
        tx
      );

      if (txnResult && (txnResult as any).isDuplicate) {
        throw new Error(`تم قيد هذه المعاملة المالية مسبقاً برقم ${(txnResult as any).txnId}. تم إلغاء العملية لمنع التكرار.`);
      }

      return {
        newStationStock: updatedStationSupply.stock,
        totalCost,
        supplyName: supply.name,
        unit: supply.unit,
        supplierId: data.supplierId,
        isExisting: false,
      };
    },
    { maxWait: 10000, timeout: 25000 }
  );

    const { revalidateFinancialImpact } = await import('@/actions/financials');
    await revalidateFinancialImpact('مورد مستلزمات', result.supplierId);
    safeRevalidatePath('/packaging-purchases');
    safeRevalidatePath('/supplies');

    if (result.isExisting) {
      return {
        success: true,
        message: 'تم التعرف على فاتورة الشراء المسجلة مسبقاً دون تكرار المخزون أو القيد المالي.',
      };
    }

    return {
      success: true,
      message: `تم قيد شراء المستلزمات بنجاح ورصيد مخزن المحطة أصبح ${Number(result.newStationStock).toLocaleString()} ${result.unit}`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء قيد شراء المستلزمات') };
  }
}

export async function getStationsForPackagingSelect() {
  try {
    return await prisma.station.findMany({
      where: { isActive: true },
      select: { id: true, name: true, location: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch stations for packaging select:', error);
    return [];
  }
}

export async function getSuppliesForPurchaseSelect() {
  try {
    return await prisma.supply.findMany({
      select: { id: true, code: true, name: true, unit: true, stock: true, unitPrice: true, category: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch supplies for purchase select:', error);
    return [];
  }
}

export async function getPackagingSuppliersSelect() {
  try {
    const packagingSuppliers = await prisma.supplier.findMany({
      where: { type: 'PACKAGING' },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });

    if (packagingSuppliers.length > 0) return packagingSuppliers;

    return await prisma.supplier.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch suppliers for packaging:', error);
    return [];
  }
}
