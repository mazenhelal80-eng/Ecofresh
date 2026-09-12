"use server";

import { safeRevalidatePath } from '@/lib/utils';
import { formatActionError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { TransferSchema } from '@/lib/validations/transfer';
import { getStationLocation, updateStationSupplyStock, logStockMovement } from '@/lib/stock-service';
import { WarehouseType } from '@prisma/client';

/**
 * Concurrency-safe, collision-free Transfer ID generator
 */
export async function generateTransferId(tx: any, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(100 + Math.random() * 900);
  let transferId = `TRF-${year}-${timestamp}${random}`;

  while (await tx.stockTransfer.findUnique({ where: { transferId } })) {
    const newRandom = Math.floor(100 + Math.random() * 900);
    transferId = `TRF-${year}-${Date.now().toString().slice(-4)}${newRandom}`;
  }
  return transferId;
}

export async function createStockTransfer(payload: unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'CREATE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بعمل تحويلات بين المحطات' };
  }

  const validated = TransferSchema.safeParse(payload);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const transferDate = data.date ? new Date(data.date) : new Date();
  const itemType = (data.itemType as WarehouseType) || WarehouseType.FINISHED;

  if (data.fromStationId === data.toStationId) {
    return { success: false, error: 'لا يمكن تحويل رصيد لنفس المحطة المصدر' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate stations exist and are active
      const fromStation = await tx.station.findUnique({ where: { id: data.fromStationId } });
      const toStation = await tx.station.findUnique({ where: { id: data.toStationId } });
      if (!fromStation || !fromStation.isActive) throw new Error(`المحطة المصدر (${data.fromStationId}) غير موجودة أو غير نشطة`);
      if (!toStation || !toStation.isActive) throw new Error(`المحطة الوجهة (${data.toStationId}) غير موجودة أو غير نشطة`);

      // 2. Resolve source and target locations
      const fromLocation = await getStationLocation(tx, data.fromStationId, itemType);
      const toLocation = await getStationLocation(tx, data.toStationId, itemType);

      if (fromLocation.stationId !== data.fromStationId || toLocation.stationId !== data.toStationId) {
        throw new Error('فشل التحقق من تبعية المخازن للمحطات المحددة');
      }

      // 2. Strict transfer rule: fromLocation.type must equal toLocation.type
      if (fromLocation.type !== toLocation.type) {
        throw new Error('غير مسموح بالنقل المباشر بين أنواع مخازن مختلفة. التحويل بين الخامات والمنتج التام يجب أن يتم عبر عمليات التشغيل فقط.');
      }

      let productName = '';
      let targetBatchId = '';
      let rawBatchId: string | null = null;
      let fgBatchId: string | null = null;
      let supplyId: string | null = null;

      // 3. Process Transfer based on itemType
      if (itemType === WarehouseType.FINISHED) {
        const batchId = data.fgBatchId || data.batchId;
        if (!batchId) throw new Error('يرجى اختيار الباتش الجاهز المراد نقله');

        const sourceBatch = await tx.finishedGoodsBatch.findUnique({
          where: { fgBatchId: batchId },
        });

        if (!sourceBatch) throw new Error('الباتش المراد نقله غير موجود');
        if (sourceBatch.stationId !== data.fromStationId) {
          throw new Error(`الباتش ${batchId} يتبع محطة أخرى ولا يتبع المحطة المصدر (${data.fromStationId})`);
        }

        const available = Number(sourceBatch.availableQty);
        if (data.qtyKg > available) {
          throw new Error(`الكمية المطلوبة (${data.qtyKg} كجم) تتجاوز الرصيد المتاح (${available} كجم) بمخزن المصدر`);
        }

        // Decrement source batch with optimistic concurrency guard
        const decResult = await tx.finishedGoodsBatch.updateMany({
          where: {
            fgBatchId: batchId,
            availableQty: { gte: data.qtyKg },
          },
          data: { availableQty: { decrement: data.qtyKg } },
        });

        if (decResult.count === 0) {
          throw new Error(`تعذر تحويل الباتش ${batchId} نظراً لتغير الرصيد أثناء المعالجة المتزامنة`);
        }

        productName = sourceBatch.productName;
        fgBatchId = batchId;
        targetBatchId = `${batchId}-T-${data.toStationId}`;

        const existingTarget = await tx.finishedGoodsBatch.findUnique({ where: { fgBatchId: targetBatchId } });
        if (existingTarget) {
          await tx.finishedGoodsBatch.update({
            where: { fgBatchId: targetBatchId },
            data: {
              availableQty: { increment: data.qtyKg },
              initialQty: { increment: data.qtyKg },
              totalValue: { increment: data.qtyKg * Number(sourceBatch.costPerKg) },
            },
          });
        } else {
          await tx.finishedGoodsBatch.create({
            data: {
              fgBatchId: targetBatchId,
              sourceType: sourceBatch.sourceType,
              sourceOpId: sourceBatch.sourceOpId,
              dealRef: sourceBatch.dealRef,
              stationId: data.toStationId,
              locationId: toLocation.id,
              productName: sourceBatch.productName,
              productionDate: sourceBatch.productionDate,
              expiryDate: sourceBatch.expiryDate,
              initialQty: data.qtyKg,
              availableQty: data.qtyKg,
              costPerKg: sourceBatch.costPerKg,
              totalValue: data.qtyKg * Number(sourceBatch.costPerKg),
              rawSources: sourceBatch.rawSources as any,
              suppliersSummary: sourceBatch.suppliersSummary as any,
              createdById: user.id,
            },
          });
        }

        // Log StockMovement entries for FG transfer
        await logStockMovement(tx, {
          movementType: 'TRANSFER_OUT',
          sourceLocationId: fromLocation.id,
          destinationLocationId: toLocation.id,
          itemType: WarehouseType.FINISHED,
          fgBatchId: batchId,
          qty: data.qtyKg,
          unit: 'KG',
          referenceType: 'STOCK_TRANSFER',
          notes: `تحويل منتج تام صادر إلى محطة ${data.toStationId}`,
          createdById: user.id,
        });

        await logStockMovement(tx, {
          movementType: 'TRANSFER_IN',
          sourceLocationId: fromLocation.id,
          destinationLocationId: toLocation.id,
          itemType: WarehouseType.FINISHED,
          fgBatchId: targetBatchId,
          qty: data.qtyKg,
          unit: 'KG',
          referenceType: 'STOCK_TRANSFER',
          notes: `تحويل منتج تام وارد من محطة ${data.fromStationId}`,
          createdById: user.id,
        });
      } else if (itemType === WarehouseType.RAW) {
        const batchId = data.rawBatchId || data.batchId;
        if (!batchId) throw new Error('يرجى اختيار لوط الخام المراد نقله');

        const sourceBatch = await tx.rawBatch.findUnique({
          where: { batchId },
          include: { supplier: true },
        });

        if (!sourceBatch) throw new Error('لوط الخام المراد نقله غير موجود');
        if (sourceBatch.stationId !== data.fromStationId) {
          throw new Error(`لوط الخام ${batchId} يتبع محطة أخرى ولا يتبع المحطة المصدر (${data.fromStationId})`);
        }
        if (sourceBatch.qcStatus !== 'APPROVED') {
          throw new Error(`لوط الخام ${batchId} لم يجتز فحص الجودة بعد (الحالة: ${sourceBatch.qcStatus})`);
        }

        const available = Number(sourceBatch.availableQty);
        if (data.qtyKg > available) {
          throw new Error(`الكمية المطلوبة (${data.qtyKg} كجم) تتجاوز الرصيد المتاح (${available} كجم) بمخزن الخامات المصدر`);
        }

        const decResult = await tx.rawBatch.updateMany({
          where: {
            batchId,
            availableQty: { gte: data.qtyKg },
          },
          data: { availableQty: { decrement: data.qtyKg } },
        });

        if (decResult.count === 0) {
          throw new Error(`تعذر تحويل لوط الخام ${batchId} نظراً لتغير الرصيد أثناء المعالجة المتزامنة`);
        }

        productName = sourceBatch.rawProduct;
        rawBatchId = batchId;
        targetBatchId = `${batchId}-T-${data.toStationId}`;

        const existingTarget = await tx.rawBatch.findUnique({ where: { batchId: targetBatchId } });
        if (existingTarget) {
          await tx.rawBatch.update({
            where: { batchId: targetBatchId },
            data: {
              availableQty: { increment: data.qtyKg },
              initialQty: { increment: data.qtyKg },
            },
          });
        } else {
          await tx.rawBatch.create({
            data: {
              batchId: targetBatchId,
              stationId: data.toStationId,
              locationId: toLocation.id,
              rawProduct: sourceBatch.rawProduct,
              supplierId: sourceBatch.supplierId,
              grossQtyKg: data.qtyKg,
              tareQtyKg: 0,
              initialQty: data.qtyKg,
              availableQty: data.qtyKg,
              unitPriceEgp: sourceBatch.unitPriceEgp,
              transportCostEgp: 0,
              unitCost: sourceBatch.unitCost,
              totalPayableEgp: data.qtyKg * Number(sourceBatch.unitCost),
              receivedDate: sourceBatch.receivedDate,
              qcStatus: sourceBatch.qcStatus,
              brixDegree: sourceBatch.brixDegree,
              createdById: user.id,
            },
          });
        }

        await logStockMovement(tx, {
          movementType: 'TRANSFER_OUT',
          sourceLocationId: fromLocation.id,
          destinationLocationId: toLocation.id,
          itemType: WarehouseType.RAW,
          rawBatchId: batchId,
          qty: data.qtyKg,
          unit: 'KG',
          referenceType: 'STOCK_TRANSFER',
          notes: `تحويل خامات صادر إلى محطة ${data.toStationId}`,
          createdById: user.id,
        });

        await logStockMovement(tx, {
          movementType: 'TRANSFER_IN',
          sourceLocationId: fromLocation.id,
          destinationLocationId: toLocation.id,
          itemType: WarehouseType.RAW,
          rawBatchId: targetBatchId,
          qty: data.qtyKg,
          unit: 'KG',
          referenceType: 'STOCK_TRANSFER',
          notes: `تحويل خامات وارد من محطة ${data.fromStationId}`,
          createdById: user.id,
        });
      } else if (itemType === WarehouseType.SUPPLIES) {
        if (!data.supplyId) throw new Error('يرجى اختيار المستلزم المراد نقله');

        const supply = await tx.supply.findUnique({ where: { id: data.supplyId } });
        if (!supply) throw new Error('المستلزم غير موجود');

        // Deduct from source location supplies
        await updateStationSupplyStock(tx, fromLocation.id, data.supplyId, -data.qtyKg);

        // Increment destination location supplies
        await updateStationSupplyStock(tx, toLocation.id, data.supplyId, data.qtyKg);

        productName = supply.name;
        supplyId = data.supplyId;

        await logStockMovement(tx, {
          movementType: 'TRANSFER_OUT',
          sourceLocationId: fromLocation.id,
          destinationLocationId: toLocation.id,
          itemType: WarehouseType.SUPPLIES,
          supplyId: data.supplyId,
          qty: data.qtyKg,
          unit: supply.unit,
          referenceType: 'STOCK_TRANSFER',
          notes: `تحويل مستلزمات صادر إلى محطة ${data.toStationId}`,
          createdById: user.id,
        });

        await logStockMovement(tx, {
          movementType: 'TRANSFER_IN',
          sourceLocationId: fromLocation.id,
          destinationLocationId: toLocation.id,
          itemType: WarehouseType.SUPPLIES,
          supplyId: data.supplyId,
          qty: data.qtyKg,
          unit: supply.unit,
          referenceType: 'STOCK_TRANSFER',
          notes: `تحويل مستلزمات وارد من محطة ${data.fromStationId}`,
          createdById: user.id,
        });
      }

      // 4. Generate StockTransfer audit document number safely
      const transferId = await generateTransferId(tx, transferDate);

      await tx.stockTransfer.create({
        data: {
          transferId,
          date: transferDate,
          fromStationId: data.fromStationId,
          toStationId: data.toStationId,
          fromLocationId: fromLocation.id,
          toLocationId: toLocation.id,
          itemType,
          batchId: fgBatchId || undefined,
          rawBatchId,
          fgBatchId,
          supplyId,
          productName,
          qtyKg: data.qtyKg,
          truckPlate: data.truckPlate && data.truckPlate.trim() ? data.truckPlate.trim() : null,
          driverName: data.driverName && data.driverName.trim() ? data.driverName.trim() : null,
          status: 'تم الاستلام بنجاح',
          notes: data.notes,
          createdById: user.id,
        },
      });

      return {
        transferId,
        targetBatchId: itemType === WarehouseType.RAW || itemType === WarehouseType.FINISHED ? targetBatchId : null,
      };
    }, { timeout: 8000 });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/transfers');
    safeRevalidatePath('/supplies');
    return {
      success: true,
      data: result,
      message: `تم بنجاح توثيق إذن التحويل ${result.transferId} ونقل الرصيد بين المخازن بنجاح`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error) };
  }
}

export async function getStockTransfersPaginated(page: number = 1, pageSize: number = 25) {
  try {
    const skip = (page - 1) * pageSize;
    const [transfers, totalCount] = await Promise.all([
      prisma.stockTransfer.findMany({
        include: {
          fromStation: true,
          toStation: true,
          fromLocation: true,
          toLocation: true,
          batch: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.stockTransfer.count(),
    ]);

    return {
      transfers: JSON.parse(JSON.stringify(transfers)),
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      page,
      pageSize,
    };
  } catch (error) {
    console.error('Failed to fetch paginated stock transfers:', error);
    return {
      transfers: [],
      totalCount: 0,
      totalPages: 0,
      page,
      pageSize,
    };
  }
}

export async function getStockTransfers() {
  try {
    return await prisma.stockTransfer.findMany({
      include: {
        fromStation: true,
        toStation: true,
        fromLocation: true,
        toLocation: true,
        batch: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    console.error('Failed to fetch stock transfers:', error);
    return [];
  }
}

export async function getTransferModalData() {
  try {
    const [stations, fgBatches, rawBatches, stationSupplies] = await Promise.all([
      prisma.station.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      prisma.finishedGoodsBatch.findMany({
        where: { availableQty: { gt: 0 } },
        include: { station: true, location: true },
        orderBy: { fgBatchId: 'asc' },
      }),
      prisma.rawBatch.findMany({
        where: { availableQty: { gt: 0 } },
        include: { station: true, location: true },
        orderBy: { batchId: 'asc' },
      }),
      prisma.stationSupply.findMany({
        where: { stock: { gt: 0 } },
        include: {
          supply: true,
          location: { include: { station: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      stations: JSON.parse(JSON.stringify(stations)),
      fgBatches: JSON.parse(JSON.stringify(fgBatches)),
      batches: JSON.parse(JSON.stringify(fgBatches)), // backward compatibility
      rawBatches: JSON.parse(JSON.stringify(rawBatches)),
      stationSupplies: JSON.parse(JSON.stringify(stationSupplies)),
    };
  } catch (error) {
    console.error('Failed to fetch transfer modal data:', error);
    return {
      stations: [],
      fgBatches: [],
      batches: [],
      rawBatches: [],
      stationSupplies: [],
    };
  }
}

export async function cancelStockTransfer(transferId: string, cancelReason: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'DELETE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بإلغاء أو عكس التحويلات المخزنية' };
  }

  if (!cancelReason || cancelReason.trim().length < 5) {
    return { success: false, error: 'يرجى كتابة سبب الإلغاء بالتفصيل (5 أحرف على الأقل)' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { transferId },
      });

      if (!transfer) throw new Error('إذن التحويل غير موجود');
      if (transfer.status === 'CANCELLED') throw new Error('إذن التحويل ملغى بالفعل مسبقاً');

      const qty = Number(transfer.qtyKg);
      const itemType = transfer.itemType || WarehouseType.FINISHED;

      if (itemType === WarehouseType.FINISHED) {
        const targetBatchId = `${transfer.fgBatchId || transfer.batchId}-T-${transfer.toStationId}`;
        const targetBatch = await tx.finishedGoodsBatch.findUnique({ where: { fgBatchId: targetBatchId } });
        if (targetBatch && Number(targetBatch.availableQty) < qty) {
          throw new Error(`لا يمكن إلغاء التحويل. الرصيد المحوّل لم يعد متاحاً بالكامل بالمحطة الوجهة (المتاح: ${targetBatch.availableQty} كجم)`);
        }

        // Revert target batch
        if (targetBatch) {
          await tx.finishedGoodsBatch.update({
            where: { fgBatchId: targetBatchId },
            data: { availableQty: { decrement: qty } },
          });
        }

        // Restore source batch
        const sourceBatchId = transfer.fgBatchId || transfer.batchId;
        if (sourceBatchId) {
          await tx.finishedGoodsBatch.update({
            where: { fgBatchId: sourceBatchId },
            data: { availableQty: { increment: qty } },
          });
        }
      } else if (itemType === WarehouseType.RAW) {
        const targetBatchId = `${transfer.rawBatchId}-T-${transfer.toStationId}`;
        const targetBatch = await tx.rawBatch.findUnique({ where: { batchId: targetBatchId } });
        if (targetBatch && Number(targetBatch.availableQty) < qty) {
          throw new Error(`لا يمكن إلغاء التحويل. رصيد الخام المحوّل لم يعد متاحاً بالكامل بالمحطة الوجهة (المتاح: ${targetBatch.availableQty} كجم)`);
        }

        if (targetBatch) {
          await tx.rawBatch.update({
            where: { batchId: targetBatchId },
            data: { availableQty: { decrement: qty } },
          });
        }

        if (transfer.rawBatchId) {
          await tx.rawBatch.update({
            where: { batchId: transfer.rawBatchId },
            data: { availableQty: { increment: qty } },
          });
        }
      } else if (itemType === WarehouseType.SUPPLIES) {
        if (!transfer.supplyId || !transfer.fromLocationId || !transfer.toLocationId) {
          throw new Error('بيانات تحويل المستلزم غير مكتملة');
        }

        // Deduct from destination location & add back to source location
        await updateStationSupplyStock(tx, transfer.toLocationId, transfer.supplyId, -qty);
        await updateStationSupplyStock(tx, transfer.fromLocationId, transfer.supplyId, qty);
      }

      // Log reversal stock movements
      if (transfer.fromLocationId && transfer.toLocationId) {
        await logStockMovement(tx, {
          movementType: 'REVERSAL_IN',
          sourceLocationId: transfer.toLocationId,
          destinationLocationId: transfer.fromLocationId,
          itemType,
          rawBatchId: itemType === WarehouseType.RAW ? transfer.rawBatchId : null,
          fgBatchId: itemType === WarehouseType.FINISHED ? (transfer.fgBatchId || transfer.batchId) : null,
          supplyId: itemType === WarehouseType.SUPPLIES ? transfer.supplyId : null,
          qty,
          unit: 'KG',
          referenceType: 'TRANSFER_REVERSAL',
          referenceId: transfer.transferId,
          notes: `عكس تحويل مخزني ${transfer.transferId}: ${cancelReason}`,
          createdById: user.id,
        });
      }

      // Update transfer status with race condition protection
      const updatedTransfer = await tx.stockTransfer.updateMany({
        where: {
          transferId: transfer.transferId,
          status: { not: 'CANCELLED' },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledById: user.id,
          cancelReason,
        },
      });

      if (updatedTransfer.count === 0) {
        throw new Error('تم إلغاء التحويل بالفعل بواسطة طلب آخر متزامن');
      }

      return { transferId: transfer.transferId };
    }, { timeout: 10000 });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/transfers');
    safeRevalidatePath('/supplies');

    return {
      success: true,
      message: `تم بنجاح إلغاء وعكس التحويل ${result.transferId} واستعادة الأرصدة للمحطة المصدر`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء إلغاء التحويل') };
  }
}
