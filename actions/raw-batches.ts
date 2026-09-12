"use server";

import { safeRevalidatePath } from '@/lib/utils';
import { formatActionError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { RawArrivalSchema } from '@/lib/validations/raw-arrival';
import { getStationLocation, logStockMovement } from '@/lib/stock-service';
import { WarehouseType } from '@prisma/client';

export type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

/**
 * Concurrency-safe, collision-free Raw Batch ID generator
 */
export async function generateRawBatchId(tx: any, date: Date = new Date()): Promise<string> {
  const dateStr = date.toISOString().substring(0, 10).replace(/-/g, '');
  const random = Math.floor(10 + Math.random() * 90);
  let batchId = `LOT-RAW-${dateStr}-${random}`;

  while (await tx.rawBatch.findUnique({ where: { batchId } })) {
    const newRandom = Math.floor(10 + Math.random() * 90);
    batchId = `LOT-RAW-${dateStr}-${newRandom}`;
  }
  return batchId;
}

export async function addRawMaterialArrival(
  payload: unknown
): Promise<ActionResult<{ batchId: string; netQty: number; isExisting?: boolean }>> {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'CREATE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بتسجيل وارد خام' };
  }

  const validated = RawArrivalSchema.safeParse(payload);
  if (!validated.success) {
    return {
      success: false,
      error: 'بيانات الاستلام غير صحيحة',
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const data = validated.data;
  const netQty = Number((data.grossQtyKg - data.tareQtyKg).toFixed(4));
  if (netQty <= 0) {
    return { success: false, error: 'الوزن الصافي يجب أن يكون أكبر من الصفر' };
  }

  const totalPayable = Number((netQty * data.unitPriceEgp + (data.transportCostEgp || 0)).toFixed(4));
  const unitCost = netQty > 0 ? Number((totalPayable / netQty).toFixed(4)) : 0;
  const receivedDate = data.receivedDate ? new Date(data.receivedDate) : new Date();

  try {
    const result = await prisma.$transaction(
      async (tx) => {
      // 1. Validate Station & Resolve RAW StockLocation
      const station = await tx.station.findUnique({ where: { id: data.stationId } });
      if (!station || !station.isActive) {
        throw new Error(`المحطة المحددة (${data.stationId}) غير موجودة أو غير نشطة`);
      }

      const rawLocation = await getStationLocation(tx, data.stationId, WarehouseType.RAW);
      if (rawLocation.stationId !== data.stationId || rawLocation.type !== WarehouseType.RAW) {
        throw new Error('فشل التحقق من تبعية مخزن الخامات للمحطة المحددة');
      }

      // 2. Validate Supplier
      const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
      if (!supplier) throw new Error(`المورد المحدد (${data.supplierId}) غير موجود`);
      if (supplier.status !== 'معتمد') throw new Error(`المورد (${supplier.name}) غير معتمد حالياً`);

      // 3. Idempotency Check: Prevent duplicate lot generation on double clicks / retries
      let existingBatch = null;

      // Check by submissionId if provided
      if (data.submissionId) {
        existingBatch = await tx.rawBatch.findFirst({
          where: {
            stationId: data.stationId,
            supplierId: data.supplierId,
            notes: { contains: `[SUB:${data.submissionId}]` },
          },
        });
      }

      // If not found by submissionId, check by exact arrival criteria on same day
      if (!existingBatch && data.truckPlate) {
        const startOfDay = new Date(receivedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(receivedDate);
        endOfDay.setHours(23, 59, 59, 999);

        existingBatch = await tx.rawBatch.findFirst({
          where: {
            stationId: data.stationId,
            supplierId: data.supplierId,
            truckPlate: data.truckPlate,
            receivedDate: { gte: startOfDay, lte: endOfDay },
            rawProduct: data.rawProduct,
            initialQty: netQty,
          },
        });
      }

      const { AccountingService } = await import('@/lib/accounting/accounting-service');

      if (existingBatch) {
        // Lot already exists! Check if financial transaction was posted
        const existingTxn = await tx.financialTransaction.findFirst({
          where: {
            relatedEntityType: 'RAW_BATCH',
            relatedEntityId: existingBatch.batchId,
            status: { not: 'ملغاة' },
          },
        });

        if (existingTxn) {
          // Completely posted already! Idempotent return without duplicate lot, stock, or payable
          return {
            batchId: existingBatch.batchId,
            netQty: Number(existingBatch.initialQty),
            supplierId: data.supplierId,
            isExisting: true,
          };
        }

        // Lot exists but missing AP entry: post AP entry idempotently for existing batch
        await AccountingService.recordTransaction(
          {
            date: receivedDate,
            type: 'استحقاق توريد خام (AP)',
            partyType: 'مورد خام',
            partyId: data.supplierId,
            partyName: supplier.name,
            amountEgp: totalPayable,
            currency: 'EGP',
            relatedEntityType: 'RAW_BATCH',
            relatedEntityId: existingBatch.batchId,
            refDoc: existingBatch.batchId,
            paymentMethod: 'CREDIT',
            description: `استحقاق توريد ${netQty.toLocaleString()} كجم ${data.rawProduct} باللوط ${existingBatch.batchId}`,
            createdById: user.id,
          },
          tx
        );

        return {
          batchId: existingBatch.batchId,
          netQty: Number(existingBatch.initialQty),
          supplierId: data.supplierId,
          isExisting: true,
        };
      }

      // 4. Concurrency-safe, collision-free Batch ID generation
      const batchId = await generateRawBatchId(tx, receivedDate);
      const subTag = data.submissionId ? ` [SUB:${data.submissionId}]` : '';
      const notesWithSub = data.notes ? `${data.notes}${subTag}` : (subTag ? subTag.trim() : null);

      // 5. Create RawBatch record linked to locationId
      await tx.rawBatch.create({
        data: {
          batchId,
          stationId: data.stationId,
          locationId: rawLocation.id,
          supplierId: data.supplierId,
          rawProduct: data.rawProduct,
          grossQtyKg: data.grossQtyKg,
          tareQtyKg: data.tareQtyKg,
          initialQty: netQty,
          availableQty: netQty,
          unitPriceEgp: data.unitPriceEgp,
          transportCostEgp: data.transportCostEgp || 0,
          unitCost,
          totalPayableEgp: totalPayable,
          receivedDate,
          brixDegree: data.brixDegree || null,
          truckPlate: data.truckPlate,
          driverName: data.driverName,
          notes: notesWithSub,
          createdById: user.id,
        },
      });

      // 6. Log StockMovement audit ledger entry
      await logStockMovement(tx, {
        movementType: 'PURCHASE',
        sourceLocationId: null,
        destinationLocationId: rawLocation.id,
        itemType: WarehouseType.RAW,
        rawBatchId: batchId,
        qty: netQty,
        unit: 'KG',
        referenceType: 'RAW_ARRIVAL',
        referenceId: batchId,
        notes: `وارد خام من المورد (فاتورة / نقل: ${data.truckPlate || 'N/A'})`,
        createdById: user.id,
      });

      // 7. Create AP Financial Transaction via AccountingService
      await AccountingService.recordTransaction(
        {
          date: receivedDate,
          type: 'استحقاق توريد خام (AP)',
          partyType: 'مورد خام',
          partyId: data.supplierId,
          partyName: supplier.name,
          amountEgp: totalPayable,
          currency: 'EGP',
          relatedEntityType: 'RAW_BATCH',
          relatedEntityId: batchId,
          refDoc: batchId,
          paymentMethod: 'CREDIT',
          description: `استحقاق توريد ${netQty.toLocaleString()} كجم ${data.rawProduct} باللوط ${batchId}`,
          createdById: user.id,
        },
        tx
      );

      return { batchId, netQty, supplierId: data.supplierId, isExisting: false };
    },
    { maxWait: 10000, timeout: 25000 }
  );

    const { revalidateFinancialImpact } = await import('@/actions/financials');
    await revalidateFinancialImpact('مورد خام', result.supplierId);
    safeRevalidatePath('/raw-purchases');
    safeRevalidatePath('/inventory/raw');

    const message = result.isExisting
      ? `تم التعرف على الوارد المسجل مسبقاً برقم اللوط ${result.batchId} دون إنشاء تكرار.`
      : `تم بنجاح توليد اللوط ${result.batchId} وقيد استحقاق المورد بصافي ${result.netQty.toLocaleString()} كجم بمخزن الخامات!`;

    return {
      success: true,
      data: result,
      message,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء قيد الوارد') };
  }
}

export async function getRawBatches() {
  try {
    return await prisma.rawBatch.findMany({
      include: {
        station: true,
        location: true,
        supplier: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    console.error('Failed to fetch raw batches:', error);
    return [];
  }
}

export async function getStationsForRawSelect() {
  try {
    return await prisma.station.findMany({
      where: { isActive: true },
      select: { id: true, name: true, location: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch stations for raw select:', error);
    return [];
  }
}

export async function getSuppliersForRawSelect() {
  try {
    return await prisma.supplier.findMany({
      select: { id: true, code: true, name: true, mainProduct: true, type: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch suppliers for raw select:', error);
    return [];
  }
}
