"use server";

import { safeRevalidatePath } from '@/lib/utils';
import { formatActionError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { ProcessingSchema } from '@/lib/validations/processing';
import { getStationLocation, updateStationSupplyStock, logStockMovement } from '@/lib/stock-service';
import { WarehouseType } from '@prisma/client';

/**
 * Concurrency-safe, collision-free Operation ID generator
 */
export async function generateOperationId(tx: any, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(100 + Math.random() * 900);
  let opId = `PR-${year}-${timestamp}${random}`;

  while (await tx.processingOperation.findUnique({ where: { id: opId } })) {
    const newRandom = Math.floor(100 + Math.random() * 900);
    opId = `PR-${year}-${Date.now().toString().slice(-4)}${newRandom}`;
  }
  return opId;
}

/**
 * Concurrency-safe, collision-free Finished Goods Batch ID generator
 */
export async function generateFgBatchId(tx: any, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(100 + Math.random() * 900);
  let fgBatchId = `FG-PR-${year}-${timestamp}${random}`;

  while (await tx.finishedGoodsBatch.findUnique({ where: { fgBatchId } })) {
    const newRandom = Math.floor(100 + Math.random() * 900);
    fgBatchId = `FG-PR-${year}-${Date.now().toString().slice(-4)}${newRandom}`;
  }
  return fgBatchId;
}

export async function createProcessingOperation(payload: unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'CREATE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بإنشاء عمليات تشغيل' };
  }

  const validated = ProcessingSchema.safeParse(payload);
  if (!validated.success) {
    return { success: false, error: 'بيانات غير صحيحة', errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const opDate = data.date ? new Date(data.date) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate Station Exists
      const station = await tx.station.findUnique({
        where: { id: data.stationId },
      });
      if (!station) {
        throw new Error(`محطة التشغيل المحددة (${data.stationId}) غير موجودة`);
      }

      // 2. Resolve Station-Bound Warehouses (Root Context)
      const rawLocation = await getStationLocation(tx, data.stationId, WarehouseType.RAW);
      const suppliesLocation = await getStationLocation(tx, data.stationId, WarehouseType.SUPPLIES);
      const fgLocation = await getStationLocation(tx, data.stationId, WarehouseType.FINISHED);

      if (
        rawLocation.stationId !== data.stationId ||
        fgLocation.stationId !== data.stationId ||
        suppliesLocation.stationId !== data.stationId
      ) {
        throw new Error('فشل التحقق من ارتباط المخازن بالمحطة المحددة');
      }

      // 3. Process Raw Inputs (Strict Station Isolation & Overdraft Prevention)
      if (!data.targetRawKg || data.targetRawKg <= 0) {
        throw new Error('الكمية المستهدفة للسحب يجب أن تكون أكبر من الصفر');
      }

      const totalRawWithdrawn = data.rawIssues.reduce((sum, issue) => sum + (Number(issue.qty) || 0), 0);
      if (Math.abs(totalRawWithdrawn - data.targetRawKg) > 0.001) {
        throw new Error(
          `عدم تطابق في سحب الخامات: إجمالي المسحوب الفعلي (${totalRawWithdrawn} كجم) لا يساوي الكمية المستهدفة المطلوبة (${data.targetRawKg} كجم)`
        );
      }

      let rawInputKg = 0;
      let rawCost = 0;
      const rawIssuesToCreate: Array<{
        batchId: string;
        supplierName: string;
        qtyKg: number;
        unitCost: number;
        totalCost: number;
      }> = [];

      for (const issue of data.rawIssues) {
        if (issue.qty <= 0) {
          throw new Error('كمية الخام المسحوبة يجب أن تكون أكبر من 0');
        }

        const rawBatch = await tx.rawBatch.findUnique({
          where: { batchId: issue.batchId },
          include: { supplier: true },
        });

        if (!rawBatch) {
          throw new Error(`اللوط ${issue.batchId} غير موجود بالنظام`);
        }

        // STRICT STATION ISOLATION
        if (rawBatch.stationId !== data.stationId) {
          throw new Error(
            `مرفوض: اللوط ${issue.batchId} يتبع محطة أخرى (${rawBatch.stationId}) ولا يتبع محطة التشغيل المحددة (${data.stationId})`
          );
        }

        // Warehouse location matching check (if locationId set)
        if (rawBatch.locationId && rawBatch.locationId !== rawLocation.id) {
          throw new Error(`مرفوض: اللوط ${issue.batchId} ليس بمخزن خامات المحطة`);
        }

        // QC Approval check
        if (rawBatch.qcStatus !== 'APPROVED') {
          throw new Error(`اللوط ${issue.batchId} لم يجتز فحص الجودة بعد (الحالة: ${rawBatch.qcStatus})`);
        }

        const available = Number(rawBatch.availableQty);
        if (issue.qty > available) {
          throw new Error(
            `الكمية المطلوبة سحبها من اللوط ${issue.batchId} (${issue.qty} كجم) تتجاوز الرصيد المتاح بالمخزن (${available} كجم)`
          );
        }

        // Atomic decrement with gte guard against race conditions
        const decResult = await tx.rawBatch.updateMany({
          where: {
            batchId: issue.batchId,
            availableQty: { gte: issue.qty },
          },
          data: {
            availableQty: { decrement: issue.qty },
          },
        });

        if (decResult.count === 0) {
          throw new Error(`تعذر سحب الكمية من اللوط ${issue.batchId} نظراً لتغير الرصيد أثناء المعالجة`);
        }

        const batchUnitCost = Number(rawBatch.unitCost);
        const lineCost = Math.round(issue.qty * batchUnitCost * 100) / 100;

        rawInputKg += issue.qty;
        rawCost += lineCost;

        rawIssuesToCreate.push({
          batchId: issue.batchId,
          supplierName: rawBatch.supplier?.name || 'مورد غير معروف',
          qtyKg: issue.qty,
          unitCost: batchUnitCost,
          totalCost: lineCost,
        });
      }

      // 4. Validate Input vs Output (Strict Business Rules)
      const inputKg = rawInputKg;
      const outputKg = data.finishedOutputKg;

      if (inputKg <= 0) {
        throw new Error('إجمالي الكمية الداخلة يجب أن يكون أكبر من 0');
      }

      if (outputKg < 0) {
        throw new Error('الكمية الخارجة لا يمكن أن تكون أقل من الصفر');
      }

      if (outputKg > inputKg) {
        throw new Error('الكمية الخارجة لا يمكن أن تكون أكبر من الكمية الداخلة');
      }

      // Exact waste & yield calculations
      // Waste = Input - Output
      const rawWasteKg = Math.round((inputKg - outputKg) * 100) / 100;
      const wastePercent = inputKg > 0 ? Math.round(((rawWasteKg / inputKg) * 100) * 100) / 100 : 0;
      const yieldPercent = inputKg > 0 ? Math.round(((outputKg / inputKg) * 100) * 100) / 100 : 0;

      // 5. Codes Generation
      const opId = await generateOperationId(tx, opDate);
      const fgBatchId = outputKg > 0 ? await generateFgBatchId(tx, opDate) : null;

      // 6. Process Supplies Inputs (Station / SUPPLIES -> Production)
      let suppliesConsumedCost = 0;
      let suppliesWasteCost = 0;
      const suppliesIssuesToCreate: Array<{
        supplyId: string;
        consumedQty: number;
        wasteQty: number;
        withdrawnQty: number;
        unitCost: number;
        consumedCost: number;
        wasteCost: number;
      }> = [];

      for (const s of data.suppliesIssues || []) {
        const supply = await tx.supply.findUnique({ where: { id: s.supplyId } });
        if (!supply) throw new Error(`المستلزم ${s.supplyId} غير موجود`);

        const totalWithdrawn = s.consumed + (s.waste || 0);

        if (s.requested !== undefined && Math.abs(totalWithdrawn - s.requested) > 0.001) {
          throw new Error(
            `عدم تطابق في المستلزم "${supply.name}": إجمالي المنصرف (${totalWithdrawn}) لا يساوي الكمية المطلوبة (${s.requested})`
          );
        }

        if (totalWithdrawn > 0) {
          await updateStationSupplyStock(
            tx,
            suppliesLocation.id,
            s.supplyId,
            -totalWithdrawn
          );

          await tx.supply.update({
            where: { id: s.supplyId },
            data: { stock: { decrement: totalWithdrawn } },
          });

          const unitCost = Number(s.unitCost || supply.unitPrice || 0);
          const cCost = Math.round(s.consumed * unitCost * 100) / 100;
          const wCost = Math.round((s.waste || 0) * unitCost * 100) / 100;

          suppliesConsumedCost += cCost;
          suppliesWasteCost += wCost;

          suppliesIssuesToCreate.push({
            supplyId: s.supplyId,
            consumedQty: s.consumed,
            wasteQty: s.waste || 0,
            withdrawnQty: totalWithdrawn,
            unitCost,
            consumedCost: cCost,
            wasteCost: wCost,
          });

          await logStockMovement(tx, {
            movementType: 'CONSUMPTION',
            sourceLocationId: suppliesLocation.id,
            destinationLocationId: null,
            itemType: WarehouseType.SUPPLIES,
            supplyId: s.supplyId,
            qty: totalWithdrawn,
            unit: supply.unit,
            referenceType: 'PROCESSING_OP',
            referenceId: opId,
            notes: `استهلاك مستلزمات وتعبئة في عملية تشغيل ${opId} (${s.consumed} مستهلك، ${s.waste || 0} هالك)`,
            createdById: user.id,
          });
        }
      }

      // 7. Costing Calculations
      const contractor = await tx.contractor.findUnique({ where: { id: data.contractorId } });
      if (!contractor || !contractor.isActive) {
        throw new Error(`المقاول المحدد (${data.contractorId}) غير موجود أو غير نشط`);
      }
      const contractorRate = Number(contractor.tariffRatePerKg);
      const contractorCost = Math.round(outputKg * contractorRate * 100) / 100;

      const stationRate = Number(station.electricityRatePerKg || 2.5);
      const stationCost = Math.round(outputKg * stationRate * 100) / 100;

      const grandTotalCost =
        Math.round((rawCost + suppliesConsumedCost + suppliesWasteCost + contractorCost + stationCost + (data.otherCost || 0)) * 100) / 100;
      const costPerKg = outputKg > 0 ? Math.round((grandTotalCost / outputKg) * 100) / 100 : 0;

      // Log StockMovement for Raw Consumption per batch
      for (const issue of rawIssuesToCreate) {
        await logStockMovement(tx, {
          movementType: 'PRODUCTION_OUT',
          sourceLocationId: rawLocation.id,
          destinationLocationId: null,
          itemType: WarehouseType.RAW,
          rawBatchId: issue.batchId,
          qty: issue.qtyKg,
          unit: 'KG',
          referenceType: 'PROCESSING_OP',
          referenceId: opId,
          notes: `استهلاك خام في عملية تشغيل ${opId}`,
          createdById: user.id,
        });
      }

      // Supplier DNA tree
      const suppliersSummary = rawIssuesToCreate.map((i) => ({
        supplierName: i.supplierName,
        sharePct: inputKg > 0 ? Math.round((i.qtyKg / inputKg) * 1000) / 10 : 0,
      }));

      // 8. Create Processing Operation Record (with OperationRawIssue & OperationSupplyIssue records)
      await tx.processingOperation.create({
        data: {
          id: opId,
          date: opDate,
          stationId: data.stationId,
          rawProduct: data.rawProduct,
          finishedProduct: data.finishedProduct,
          contractorId: data.contractorId,
          locked: true,
          rawInputKg: inputKg,
          finishedOutputKg: outputKg,
          secondaryOutputKg: 0,
          rawWasteKg,
          yieldPercent,
          rawCost,
          suppliesConsumedCost,
          suppliesWasteCost,
          contractorCost,
          stationCost,
          otherCost: data.otherCost || 0,
          grandTotalCost,
          costPerKg,
          generatedBatchId: fgBatchId,
          notes: data.notes,
          createdById: user.id,
          rawIssues: {
            create: rawIssuesToCreate,
          },
          supplyIssues: {
            create: suppliesIssuesToCreate,
          },
        },
      });

      // 9. Create Finished Goods Batch in Station's FINISHED Location (ONLY IF OUTPUT > 0)
      if (outputKg > 0 && fgBatchId) {
        await tx.finishedGoodsBatch.create({
          data: {
            fgBatchId,
            sourceType: 'MANUFACTURED',
            sourceOpId: opId,
            stationId: data.stationId,
            locationId: fgLocation.id,
            productName: data.finishedProduct,
            productionDate: opDate,
            initialQty: outputKg,
            availableQty: outputKg,
            costPerKg,
            totalValue: grandTotalCost,
            rawSources: rawIssuesToCreate as any,
            suppliersSummary: suppliersSummary as any,
            createdById: user.id,
          },
        });

        // Log StockMovement for FG Output (ONLY OUTPUT QUANTITY ENTERS FINISHED STOCK)
        await logStockMovement(tx, {
          movementType: 'PRODUCTION_IN',
          sourceLocationId: null,
          destinationLocationId: fgLocation.id,
          itemType: WarehouseType.FINISHED,
          fgBatchId,
          qty: outputKg,
          unit: 'KG',
          referenceType: 'PROCESSING_OP',
          referenceId: opId,
          notes: `إيداع منتج تام مصنع بمخزن التام (${outputKg} كجم)`,
          createdById: user.id,
        });
      }

      // 10. Contractor AP Financial Transaction
      // 10. Contractor AP Financial Transaction via AccountingService
      if (contractorCost > 0) {
        const { AccountingService } = await import('@/lib/accounting/accounting-service');
        await AccountingService.recordTransaction(
          {
            date: opDate,
            type: 'استحقاق تشغيل وفرز (AP)',
            partyType: 'مقاول عمالة',
            partyId: data.contractorId,
            partyName: contractor?.name || 'مقاول معتمد',
            amountEgp: contractorCost,
            currency: 'EGP',
            relatedEntityType: 'PROCESSING_OP',
            relatedEntityId: opId,
            refDoc: opId,
            paymentMethod: 'CREDIT',
            description: `استحقاق أتعاب تشغيل ${outputKg.toLocaleString()} كجم جاهز بالعملية ${opId}`,
            createdById: user.id,
          },
          tx
        );
      }

      return {
        opId,
        fgBatchId,
        rawInputKg: inputKg,
        finishedOutputKg: outputKg,
        rawWasteKg,
        wastePercent,
        yieldPercent,
        costPerKg,
        contractorId: data.contractorId,
        stationName: station.name,
      };
    }, { timeout: 12000 });

    const { revalidateFinancialImpact } = await import('@/actions/financials');
    await revalidateFinancialImpact('مقاول عمالة', result.contractorId);
    safeRevalidatePath('/processing-operations');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw');

    return {
      success: true,
      data: result,
      message: `تم بنجاح اعتماد التشغيلة ${result.opId} (الداخل: ${result.rawInputKg} كجم، الخارج: ${result.finishedOutputKg} كجم، الهالك: ${result.rawWasteKg} كجم بنسبة ${result.wastePercent}%)`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error) };
  }
}

export async function getProcessingOperationsPaginated(
  page: number = 1,
  pageSize: number = 25,
  where: any = {}
) {
  try {
    const skip = (page - 1) * pageSize;
    const [operations, totalCount] = await Promise.all([
      prisma.processingOperation.findMany({
        where,
        include: {
          station: true,
          contractor: true,
          rawIssues: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.processingOperation.count({ where }),
    ]);

    return {
      operations: JSON.parse(JSON.stringify(operations)),
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      page,
      pageSize,
    };
  } catch (error) {
    console.error('Failed to fetch paginated processing operations:', error);
    return {
      operations: [],
      totalCount: 0,
      totalPages: 0,
      page,
      pageSize: 25,
    };
  }
}

export async function getProcessingOperations() {
  try {
    return await prisma.processingOperation.findMany({
      include: {
        station: true,
        contractor: true,
        rawIssues: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    console.error('Failed to fetch processing operations:', error);
    return [];
  }
}

export async function getProcessingWizardData() {
  try {
    const [stations, contractors, products, rawBatches, supplies] = await Promise.all([
      prisma.station.findMany({
        where: { isActive: true },
        include: {
          stockLocations: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.contractor.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.rawBatch.findMany({
        where: {
          availableQty: { gt: 0 },
          qcStatus: "APPROVED",
        },
        include: {
          supplier: true,
          station: true,
          location: true,
        },
        orderBy: { receivedDate: "desc" },
      }),
      prisma.supply.findMany({
        include: {
          stationSupplies: {
            include: { location: { include: { station: true } } },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      success: true,
      stations: JSON.parse(JSON.stringify(stations)),
      contractors: JSON.parse(JSON.stringify(contractors)),
      products: JSON.parse(JSON.stringify(products)),
      rawBatches: JSON.parse(JSON.stringify(rawBatches)),
      supplies: JSON.parse(JSON.stringify(supplies)),
    };
  } catch (error: any) {
    console.error("Failed to fetch wizard data:", error);
    return {
      success: false,
      error: error.message || "حدث خطأ أثناء تحميل بيانات المعالج",
      stations: [],
      contractors: [],
      products: [],
      rawBatches: [],
      supplies: [],
    };
  }
}

export async function getFinishedGoodsBatches() {
  try {
    return await prisma.finishedGoodsBatch.findMany({
      include: {
        station: true,
        location: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    console.error('Failed to fetch finished goods batches:', error);
    return [];
  }
}

export async function cancelProcessingOperation(operationId: string, cancelReason: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'DELETE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بإلغاء أو عكس عمليات التشغيل' };
  }

  if (!cancelReason || cancelReason.trim().length < 5) {
    return { success: false, error: 'يرجى كتابة سبب الإلغاء بالتفصيل (5 أحرف على الأقل)' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch operation with raw issues, supply issues, and generated batch
      const op = await tx.processingOperation.findUnique({
        where: { id: operationId },
        include: {
          rawIssues: true,
          supplyIssues: true,
          generatedBatches: true,
        },
      });

      if (!op) throw new Error('عملية التشغيل غير موجودة');
      if (op.status === 'CANCELLED') throw new Error('عملية التشغيل ملغاة بالفعل مسبقاً');

      // 2. Validate that generated finished goods batch has NOT been consumed or transferred
      const fgBatch = op.generatedBatchId
        ? await tx.finishedGoodsBatch.findUnique({ where: { fgBatchId: op.generatedBatchId } })
        : null;

      if (fgBatch) {
        const allocatedCount = await tx.shipmentAllocatedBatch.count({
          where: {
            fgBatchId: fgBatch.fgBatchId,
            shipment: { status: { not: 'CANCELLED' } },
          },
        });
        if (allocatedCount > 0) {
          throw new Error(
            `لا يمكن إلغاء التشغيلة. الباتش الجاهز الناتج (${fgBatch.fgBatchId}) مخصص بالفعل في شحنة تصدير قائمة.`
          );
        }

        const available = Number(fgBatch.availableQty);
        const initial = Number(fgBatch.initialQty);
        if (available < initial) {
          throw new Error(
            `لا يمكن إلغاء التشغيلة. الباتش الجاهز الناتج (${fgBatch.fgBatchId}) تم صرف أو نقل جزء منه بالفعل (المتاح: ${available} كجم من أصل ${initial} كجم)`
          );
        }
      }

      // Resolve locations for the operation's station
      const rawLocation = await getStationLocation(tx, op.stationId, WarehouseType.RAW);
      const suppliesLocation = await getStationLocation(tx, op.stationId, WarehouseType.SUPPLIES);
      const fgLocation = await getStationLocation(tx, op.stationId, WarehouseType.FINISHED);

      // 3. Restore Raw Batches (Exact reversal from OperationRawIssue)
      for (const issue of op.rawIssues) {
        const qty = Number(issue.qtyKg);
        await tx.rawBatch.update({
          where: { batchId: issue.batchId },
          data: { availableQty: { increment: qty } },
        });

        await logStockMovement(tx, {
          movementType: 'REVERSAL_IN',
          sourceLocationId: null,
          destinationLocationId: rawLocation.id,
          itemType: WarehouseType.RAW,
          rawBatchId: issue.batchId,
          qty,
          unit: 'KG',
          referenceType: 'PROCESSING_REVERSAL',
          referenceId: op.id,
          notes: `إرجاع خام نتيجة إلغاء التشغيلة ${op.id}: ${cancelReason}`,
          createdById: user.id,
        });
      }

      // 4. Restore Supplies
      for (const s of op.supplyIssues) {
        const totalWithdrawn = Number(s.withdrawnQty);
        if (totalWithdrawn > 0) {
          const supply = await tx.supply.findUnique({ where: { id: s.supplyId } });
          const supplyUnit = supply?.unit || 'قطعة';

          await updateStationSupplyStock(tx, suppliesLocation.id, s.supplyId, totalWithdrawn);
          await tx.supply.update({
            where: { id: s.supplyId },
            data: { stock: { increment: totalWithdrawn } },
          });

          await logStockMovement(tx, {
            movementType: 'REVERSAL_IN',
            sourceLocationId: null,
            destinationLocationId: suppliesLocation.id,
            itemType: WarehouseType.SUPPLIES,
            supplyId: s.supplyId,
            qty: totalWithdrawn,
            unit: supplyUnit,
            referenceType: 'PROCESSING_REVERSAL',
            referenceId: op.id,
            notes: `إرجاع مستلزمات نتيجة إلغاء التشغيلة ${op.id}: ${cancelReason}`,
            createdById: user.id,
          });
        }
      }

      // 5. Invalidate generated FG Batch
      if (fgBatch) {
        const fgQty = Number(fgBatch.initialQty);
        await tx.finishedGoodsBatch.update({
          where: { fgBatchId: fgBatch.fgBatchId },
          data: { availableQty: 0, qualityStatus: 'ملغاة - تم عكس التشغيلة' },
        });

        await logStockMovement(tx, {
          movementType: 'REVERSAL_OUT',
          sourceLocationId: fgLocation.id,
          destinationLocationId: null,
          itemType: WarehouseType.FINISHED,
          fgBatchId: fgBatch.fgBatchId,
          qty: fgQty,
          unit: 'KG',
          referenceType: 'PROCESSING_REVERSAL',
          referenceId: op.id,
          notes: `إلغاء دفعة تام نتيجة إلغاء التشغيلة ${op.id}`,
          createdById: user.id,
        });
      }

      // 6. Reverse Contractor AP Financial Transaction
      await tx.financialTransaction.updateMany({
        where: { refDoc: op.id, type: 'استحقاق تشغيل وفرز (AP)' },
        data: { status: 'ملغاة' },
      });

      // 7. Update Operation Status to CANCELLED with race condition check
      const updatedOp = await tx.processingOperation.updateMany({
        where: {
          id: op.id,
          status: { not: 'CANCELLED' },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledById: user.id,
          cancelReason,
        },
      });

      if (updatedOp.count === 0) {
        throw new Error('تم إلغاء عملية التشغيل بالفعل بواسطة طلب آخر متزامن');
      }

      return { opId: op.id, contractorId: op.contractorId };
    }, { timeout: 12000 });

    const { revalidateFinancialImpact } = await import('@/actions/financials');
    await revalidateFinancialImpact('مقاول عمالة', result.contractorId);
    safeRevalidatePath('/processing-operations');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw');
    safeRevalidatePath('/financials');

    return {
      success: true,
      message: `تم بنجاح إلغاء وعكس أثر التشغيلة ${result.opId} واستعادة جميع الأرصدة الخام والتام والمستلزمات بنجاح`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء إلغاء التشغيلة') };
  }
}
