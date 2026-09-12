"use server";

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { StationSchema } from '@/lib/validations/station';
import { generateStationId } from '@/lib/id-generator';
import { ensureStationLocations, logStockMovement, updateStationSupplyStock } from '@/lib/stock-service';
import { WarehouseType } from '@prisma/client';
import { formatActionError } from '@/lib/error-handler';
import { safeRevalidatePath } from '@/lib/utils';

export async function createStation(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بإضافة محطات' };
  }

  const rawData = Object.fromEntries(formData);
  const validated = StationSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  try {
    const station = await prisma.$transaction(async (tx) => {
      const generatedId = validated.data.id || (await generateStationId(tx));
      const createdStation = await tx.station.create({
        data: {
          ...validated.data,
          id: generatedId,
        },
      });

      // Provision the 3 stock locations atomically
      await ensureStationLocations(tx, createdStation.id, createdStation.name);

      return createdStation;
    });

    revalidateTag('stations');
    revalidatePath('/stations');
    return {
      success: true,
      message: `تم تسجيل المحطة ${station.name} وإنشاء مخازنها الثلاثة (الخامات، المنتج التام، المستلزمات) بنجاح`,
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'اسم المحطة أو الكود مسجل مسبقاً' };
    }
    return { success: false, error: error.message || 'حدث خطأ أثناء حفظ بيانات المحطة' };
  }
}

export async function fetchStationsRaw() {
  try {
    const [stations, rawSums, fgSums, supplySums] = await Promise.all([
      prisma.station.findMany({
        where: { isActive: true },
        include: {
          stockLocations: true,
          _count: {
            select: {
              rawBatches: { where: { availableQty: { gt: 0 } } },
              finishedGoodsBatches: { where: { availableQty: { gt: 0 } } },
              operations: { where: { status: 'ACTIVE' } },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      prisma.rawBatch.groupBy({
        by: ['locationId'],
        where: { availableQty: { gt: 0 } },
        _sum: { availableQty: true },
      }),
      prisma.finishedGoodsBatch.groupBy({
        by: ['locationId'],
        where: { availableQty: { gt: 0 } },
        _sum: { availableQty: true },
      }),
      prisma.stationSupply.groupBy({
        by: ['locationId'],
        where: { stock: { gt: 0 } },
        _sum: { stock: true },
      }),
    ]);

    const rawMap = new Map(rawSums.map((r) => [r.locationId, Number(r._sum.availableQty || 0)]));
    const fgMap = new Map(fgSums.map((f) => [f.locationId, Number(f._sum.availableQty || 0)]));
    const supplyMap = new Map(supplySums.map((s) => [s.locationId, Number(s._sum.stock || 0)]));

    // Retrieve last movements and distinct item counts for each station
    const enrichedStations = await Promise.all(
      stations.map(async (st) => {
        let rawStockKg = 0;
        let fgStockKg = 0;
        let suppliesStockQty = 0;
        const locIds = st.stockLocations.map((l) => l.id);

        for (const loc of st.stockLocations) {
          if (loc.type === WarehouseType.RAW) {
            rawStockKg += rawMap.get(loc.id) || 0;
          } else if (loc.type === WarehouseType.FINISHED) {
            fgStockKg += fgMap.get(loc.id) || 0;
          } else if (loc.type === WarehouseType.SUPPLIES) {
            suppliesStockQty += supplyMap.get(loc.id) || 0;
          }
        }

        // Count distinct raw products, finished products, and supplies at this station
        const [distinctRaw, distinctFg, distinctSupplies, lastMovement] = await Promise.all([
          prisma.rawBatch.findMany({
            where: { stationId: st.id, availableQty: { gt: 0 } },
            select: { rawProduct: true },
            distinct: ['rawProduct'],
          }),
          prisma.finishedGoodsBatch.findMany({
            where: { stationId: st.id, availableQty: { gt: 0 } },
            select: { productName: true },
            distinct: ['productName'],
          }),
          prisma.stationSupply.findMany({
            where: { location: { stationId: st.id }, stock: { gt: 0 } },
            select: { supplyId: true },
            distinct: ['supplyId'],
          }),
          locIds.length > 0
            ? prisma.stockMovement.findFirst({
                where: {
                  OR: [
                    { sourceLocationId: { in: locIds } },
                    { destinationLocationId: { in: locIds } },
                  ],
                },
                orderBy: { createdAt: 'desc' },
                select: {
                  movementNo: true,
                  movementType: true,
                  createdAt: true,
                  qty: true,
                  unit: true,
                },
              })
            : null,
        ]);

        const distinctProductsCount =
          distinctRaw.length + distinctFg.length + distinctSupplies.length;

        // Compute station alerts count
        let alertsCount = 0;
        // 1. Low supply alert (< 50)
        const lowSupplyCount = await prisma.stationSupply.count({
          where: { location: { stationId: st.id }, stock: { gt: 0, lt: 50 } },
        });
        alertsCount += lowSupplyCount;

        // 2. Batches nearing depletion (< 100 kg)
        const lowRawCount = await prisma.rawBatch.count({
          where: { stationId: st.id, availableQty: { gt: 0, lt: 100 } },
        });
        alertsCount += lowRawCount;

        return {
          ...st,
          coldStorageCapacityKg: Number(st.coldStorageCapacityKg),
          electricityRatePerKg: Number(st.electricityRatePerKg),
          rawStockKg,
          fgStockKg,
          suppliesStockQty,
          totalStockKg: rawStockKg + fgStockKg,
          rawLotsCount: st._count.rawBatches,
          fgBatchesCount: st._count.finishedGoodsBatches,
          suppliesItemsCount: distinctSupplies.length,
          distinctProductsCount,
          alertsCount,
          lastMovement: lastMovement
            ? {
                ...lastMovement,
                qty: Number(lastMovement.qty),
                createdAt: lastMovement.createdAt.toISOString(),
              }
            : null,
        };
      })
    );

    return enrichedStations;
  } catch (error) {
    console.error('Failed to fetch stations:', error);
    return [];
  }
}

const cachedGetStations = unstable_cache(
  fetchStationsRaw,
  ['master-stations-list-v2'],
  { tags: ['stations'], revalidate: 60 }
);

export async function getStations() {
  try {
    return await cachedGetStations();
  } catch (err: any) {
    if (err?.message?.includes('incrementalCache') || !process.env.NEXT_RUNTIME) {
      return await fetchStationsRaw();
    }
    throw err;
  }
}

export async function getStationById(id: string) {
  try {
    return await prisma.station.findUnique({
      where: { id },
      include: {
        stockLocations: {
          include: {
            rawBatches: true,
            finishedGoodsBatches: true,
            stationSupplies: {
              include: { supply: true },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch station:', error);
    return null;
  }
}

/**
 * High-performance Station Control Center Aggregator
 * Fetches all necessary data for the Control Center tabs with ledger reconciliation
 */
export async function getStationControlCenterData(stationId: string) {
  try {
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        stockLocations: true,
      },
    });

    if (!station) {
      return { success: false, error: 'المحطة المطلوبة غير موجودة' };
    }

    const locIds = station.stockLocations.map((l) => l.id);

    // Parallel fetch of Station Assets & Activities
    const [
      rawBatches,
      finishedBatches,
      stationSupplies,
      operations,
      stockMovements,
      transfers,
      adjustments,
      auditLogs,
    ] = await Promise.all([
      prisma.rawBatch.findMany({
        where: { stationId, availableQty: { gt: 0 } },
        include: { supplier: true, location: true },
        orderBy: { receivedDate: 'desc' },
      }),
      prisma.finishedGoodsBatch.findMany({
        where: { stationId, availableQty: { gt: 0 } },
        include: { location: true },
        orderBy: { productionDate: 'desc' },
      }),
      prisma.stationSupply.findMany({
        where: { location: { stationId } },
        include: { supply: true, location: true },
        orderBy: { stock: 'desc' },
      }),
      prisma.processingOperation.findMany({
        where: { stationId },
        take: 30,
        orderBy: { date: 'desc' },
        include: {
          contractor: true,
          rawIssues: true,
          supplyIssues: { include: { supply: true } },
        },
      }),
      locIds.length > 0
        ? prisma.stockMovement.findMany({
            where: {
              OR: [
                { sourceLocationId: { in: locIds } },
                { destinationLocationId: { in: locIds } },
              ],
            },
            take: 60,
            orderBy: { createdAt: 'desc' },
            include: {
              rawBatch: { select: { batchId: true, rawProduct: true } },
              finishedGoodsBatch: { select: { fgBatchId: true, productName: true } },
              supply: { select: { id: true, name: true, unit: true } },
              sourceLocation: { select: { name: true, type: true } },
              destinationLocation: { select: { name: true, type: true } },
              createdBy: { select: { fullName: true } },
            },
          })
        : [],
      prisma.stockTransfer.findMany({
        where: {
          OR: [{ fromStationId: stationId }, { toStationId: stationId }],
        },
        take: 30,
        orderBy: { date: 'desc' },
        include: {
          fromStation: { select: { name: true } },
          toStation: { select: { name: true } },
          createdBy: { select: { fullName: true } },
        },
      }),
      prisma.stockAdjustment.findMany({
        where: { stationId },
        take: 30,
        orderBy: { date: 'desc' },
        include: {
          approvedBy: { select: { fullName: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          OR: [
            { entityType: 'station', entityId: stationId },
            { entityType: 'station_inventory' },
          ],
        },
        take: 30,
        orderBy: { performedAt: 'desc' },
        include: {
          user: { select: { fullName: true } },
        },
      }),
    ]);

    // Compute Exact Ledger Reconciliation for Top Batches & Supplies
    // Expected Balance = Sum(Inbound) - Sum(Outbound) vs Recorded Balance
    const reconciliationItems: Array<{
      itemType: 'RAW' | 'FINISHED' | 'SUPPLY';
      id: string;
      name: string;
      unit: string;
      recordedBalance: number;
      ledgerInbound: number;
      ledgerOutbound: number;
      expectedLedgerBalance: number;
      difference: number;
      isReconciled: boolean;
    }> = [];

    // 1. Reconcile Active Raw Batches
    for (const rb of rawBatches.slice(0, 15)) {
      const movements = await prisma.stockMovement.findMany({
        where: { rawBatchId: rb.batchId },
      });
      let inQty = 0;
      let outQty = 0;
      for (const m of movements) {
        const q = Number(m.qty);
        if (['PURCHASE', 'TRANSFER_IN', 'REVERSAL_IN'].includes(m.movementType)) {
          inQty += q;
        } else if (['PRODUCTION_OUT', 'TRANSFER_OUT', 'WASTE'].includes(m.movementType)) {
          outQty += q;
        } else if (m.movementType === 'ADJUSTMENT') {
          // If destination is our location, it's an increment
          if (m.destinationLocationId === rb.locationId) inQty += q;
          else if (m.sourceLocationId === rb.locationId) outQty += q;
        }
      }
      const recorded = Number(rb.availableQty);
      const expected = Math.round((inQty - outQty) * 100) / 100;
      const diff = Math.round((recorded - expected) * 100) / 100;

      reconciliationItems.push({
        itemType: 'RAW',
        id: rb.batchId,
        name: rb.rawProduct,
        unit: 'كجم',
        recordedBalance: recorded,
        ledgerInbound: inQty,
        ledgerOutbound: outQty,
        expectedLedgerBalance: expected,
        difference: diff,
        isReconciled: Math.abs(diff) < 0.01,
      });
    }

    // 2. Reconcile Active FG Batches
    for (const fg of finishedBatches.slice(0, 15)) {
      const movements = await prisma.stockMovement.findMany({
        where: { fgBatchId: fg.fgBatchId },
      });
      let inQty = 0;
      let outQty = 0;
      for (const m of movements) {
        const q = Number(m.qty);
        if (['PRODUCTION_IN', 'TRANSFER_IN', 'REVERSAL_IN'].includes(m.movementType)) {
          inQty += q;
        } else if (['SHIPMENT', 'TRANSFER_OUT', 'REVERSAL_OUT', 'WASTE'].includes(m.movementType)) {
          outQty += q;
        } else if (m.movementType === 'ADJUSTMENT') {
          if (m.destinationLocationId === fg.locationId) inQty += q;
          else if (m.sourceLocationId === fg.locationId) outQty += q;
        }
      }
      const recorded = Number(fg.availableQty);
      const expected = Math.round((inQty - outQty) * 100) / 100;
      const diff = Math.round((recorded - expected) * 100) / 100;

      reconciliationItems.push({
        itemType: 'FINISHED',
        id: fg.fgBatchId,
        name: fg.productName,
        unit: 'كجم',
        recordedBalance: recorded,
        ledgerInbound: inQty,
        ledgerOutbound: outQty,
        expectedLedgerBalance: expected,
        difference: diff,
        isReconciled: Math.abs(diff) < 0.01,
      });
    }

    // Compute Overall Reconciliation Status
    const allReconciled = reconciliationItems.every((item) => item.isReconciled);
    const totalMismatchCount = reconciliationItems.filter((item) => !item.isReconciled).length;

    // Smart Station Alerts
    const alerts: Array<{
      id: string;
      severity: 'WARNING' | 'DANGER' | 'INFO';
      title: string;
      description: string;
      link?: string;
    }> = [];

    // Low stock raw batches
    rawBatches.forEach((b) => {
      if (Number(b.availableQty) < 100) {
        alerts.push({
          id: `low-raw-${b.batchId}`,
          severity: 'WARNING',
          title: `رصيد منخفض للوط الخام (${b.batchId})`,
          description: `المتبقي ${Number(b.availableQty).toLocaleString()} كجم من محصول ${b.rawProduct}`,
        });
      }
    });

    // Low supplies stock
    stationSupplies.forEach((s) => {
      if (Number(s.stock) < 50) {
        alerts.push({
          id: `low-sup-${s.id}`,
          severity: 'DANGER',
          title: `نقص حاد في مستلزم التعبئة (${s.supply.name})`,
          description: `الرصيد المتاح بمخزن المستلزمات (${Number(s.stock).toLocaleString()} ${s.supply.unit}) أقل من حد الأمان`,
        });
      }
    });

    // High waste operations (> 20%)
    operations.slice(0, 10).forEach((op) => {
      const wastePct = Number(op.yieldPercent) < 80 ? 100 - Number(op.yieldPercent) : 0;
      if (wastePct > 20) {
        alerts.push({
          id: `high-waste-${op.id}`,
          severity: 'WARNING',
          title: `نسبة هالك مرتفعة في التشغيلة (${op.id})`,
          description: `بلغت نسبة الفاقد والهالك ${wastePct.toFixed(1)}% (المستخرج: ${Number(op.finishedOutputKg).toLocaleString()} كجم من أصل ${Number(op.rawInputKg).toLocaleString()} كجم)`,
        });
      }
    });

    // Ledger mismatch alerts
    if (!allReconciled) {
      alerts.push({
        id: `mismatch-alert`,
        severity: 'DANGER',
        title: `عدم تطابق في الدفتر المخزني (${totalMismatchCount} بنود)`,
        description: 'تم اكتشاف فارق بين سجل الحركات (StockMovement) والرصيد اللحظي المسجل. يرجى مراجعة قسم التسويات.',
      });
    }

    // Totals calculations
    const totalRawKg = rawBatches.reduce((acc, b) => acc + Number(b.availableQty || 0), 0);
    const totalFgKg = finishedBatches.reduce((acc, b) => acc + Number(b.availableQty || 0), 0);
    const totalSuppliesUnits = stationSupplies.reduce((acc, s) => acc + Number(s.stock || 0), 0);

    // Contractors who actually worked at this station (derived from operations)
    const activeContractorsAtStation = Array.from(
      new Map(
        operations
          .filter((op: any) => op.contractor)
          .map((op: any) => [op.contractor.id, op.contractor])
      ).values()
    );

    const stationPayload = {
      ...station,
      contractors: activeContractorsAtStation,
    };

    return {
      success: true,
      data: {
        station: JSON.parse(JSON.stringify(stationPayload)),
        inventory: {
          totalRawKg,
          totalFgKg,
          totalSuppliesUnits,
          rawBatches: JSON.parse(JSON.stringify(rawBatches)),
          finishedBatches: JSON.parse(JSON.stringify(finishedBatches)),
          stationSupplies: JSON.parse(JSON.stringify(stationSupplies)),
        },
        operations: JSON.parse(JSON.stringify(operations)),
        stockMovements: JSON.parse(JSON.stringify(stockMovements)),
        transfers: JSON.parse(JSON.stringify(transfers)),
        adjustments: JSON.parse(JSON.stringify(adjustments)),
        auditLogs: JSON.parse(JSON.stringify(auditLogs)),
        reconciliation: {
          status: (allReconciled ? 'RECONCILED' : 'MISMATCH') as 'RECONCILED' | 'MISMATCH',
          items: reconciliationItems,
          totalMismatchCount,
        },
        alerts,
      },
    };
  } catch (error: any) {
    console.error('Failed to fetch station control center data:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب بيانات مركز التحكم بالمحطة',
    };
  }
}

/**
 * Bidirectional Lot Traceability Engine
 * Resolves full genealogy from Supplier to Customer (Forward) or Customer to Supplier (Backward)
 */
export async function getLotTraceability(lotId: string) {
  if (!lotId || !lotId.trim()) {
    return { success: false, error: 'يرجى إدخال رقم اللوط أو الباتش للبحث' };
  }

  const query = lotId.trim();

  try {
    // 1. Check if it's a Raw Batch
    const rawBatch = await prisma.rawBatch.findUnique({
      where: { batchId: query },
      include: {
        supplier: true,
        station: true,
        location: true,
        operationIssues: {
          include: {
            operation: {
              include: {
                contractor: true,
                station: true,
                generatedBatches: {
                  include: {
                    allocatedShipments: {
                      include: {
                        shipment: {
                          include: {
                            order: { include: { customer: true } },
                            customer: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          include: {
            sourceLocation: true,
            destinationLocation: true,
            createdBy: true,
          },
        },
      },
    });

    if (rawBatch) {
      // Find inter-station transfers
      const transfers = await prisma.stockTransfer.findMany({
        where: {
          OR: [{ rawBatchId: rawBatch.batchId }, { batchId: rawBatch.batchId }],
        },
        include: { fromStation: true, toStation: true },
        orderBy: { date: 'desc' },
      });

      return {
        success: true,
        lotType: 'RAW' as const,
        lotId: rawBatch.batchId,
        productName: rawBatch.rawProduct,
        currentStatus: {
          stationName: rawBatch.station.name,
          availableQty: Number(rawBatch.availableQty),
          initialQty: Number(rawBatch.initialQty),
          unitCost: Number(rawBatch.unitCost),
          qcStatus: rawBatch.qcStatus,
          receivedDate: rawBatch.receivedDate.toISOString(),
        },
        supplier: {
          id: rawBatch.supplier.id,
          code: rawBatch.supplier.code,
          name: rawBatch.supplier.name,
          phone: rawBatch.supplier.phone,
        },
        receiptInfo: {
          truckPlate: rawBatch.truckPlate,
          driverName: rawBatch.driverName,
          brixDegree: rawBatch.brixDegree ? Number(rawBatch.brixDegree) : null,
          grossQty: Number(rawBatch.grossQtyKg),
          tareQty: Number(rawBatch.tareQtyKg),
          notes: rawBatch.notes,
        },
        transfers: transfers.map((t) => ({
          transferId: t.transferId,
          date: t.date.toISOString(),
          fromStation: t.fromStation.name,
          toStation: t.toStation.name,
          qtyKg: Number(t.qtyKg),
          truckPlate: t.truckPlate,
          driverName: t.driverName,
        })),
        movements: rawBatch.stockMovements.map((m) => ({
          movementNo: m.movementNo,
          movementType: m.movementType,
          date: m.createdAt.toISOString(),
          qty: Number(m.qty),
          unit: m.unit,
          from: m.sourceLocation?.name || 'مصدر خارجي (مورد)',
          to: m.destinationLocation?.name || 'صرف / إنتاج',
          notes: m.notes,
          user: m.createdBy?.fullName || 'النظام',
        })),
        downstreamOperations: rawBatch.operationIssues.map((issue) => {
          const op = issue.operation;
          return {
            operationId: op.id,
            date: op.date.toISOString(),
            contractorName: op.contractor.name,
            stationName: op.station.name,
            rawInputKg: Number(op.rawInputKg),
            finishedOutputKg: Number(op.finishedOutputKg),
            rawWasteKg: Number(op.rawWasteKg),
            yieldPercent: Number(op.yieldPercent),
            withdrawnFromThisLot: Number(issue.qtyKg),
            resultingBatches: op.generatedBatches.map((gb) => ({
              fgBatchId: gb.fgBatchId,
              productName: gb.productName,
              availableQty: Number(gb.availableQty),
              initialQty: Number(gb.initialQty),
              productionDate: gb.productionDate.toISOString(),
              shipments: gb.allocatedShipments.map((alloc) => ({
                shipmentId: alloc.shipment.shipmentId,
                status: alloc.shipment.status,
                dispatchDate: alloc.shipment.dispatchDate
                  ? alloc.shipment.dispatchDate.toISOString()
                  : null,
                containerNo: alloc.shipment.containerNo,
                sealNo: alloc.shipment.sealNo,
                customerName:
                  alloc.shipment.customer?.name || alloc.shipment.order?.customer?.name || 'عميل تصدير',
                shippedQtyKg: Number(alloc.qtyKg),
              })),
            })),
          };
        }),
      };
    }

    // 2. Check if it's a Finished Goods Batch
    const fgBatch = await prisma.finishedGoodsBatch.findUnique({
      where: { fgBatchId: query },
      include: {
        station: true,
        location: true,
        operation: {
          include: {
            contractor: true,
            station: true,
            rawIssues: {
              include: {
                rawBatch: {
                  include: {
                    supplier: true,
                  },
                },
              },
            },
            supplyIssues: {
              include: {
                supply: true,
              },
            },
          },
        },
        allocatedShipments: {
          include: {
            shipment: {
              include: {
                order: { include: { customer: true } },
                customer: true,
              },
            },
          },
        },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          include: {
            sourceLocation: true,
            destinationLocation: true,
            createdBy: true,
          },
        },
      },
    });

    if (fgBatch) {
      const transfers = await prisma.stockTransfer.findMany({
        where: {
          OR: [{ fgBatchId: fgBatch.fgBatchId }, { batchId: fgBatch.fgBatchId }],
        },
        include: { fromStation: true, toStation: true },
        orderBy: { date: 'desc' },
      });

      return {
        success: true,
        lotType: 'FINISHED' as const,
        lotId: fgBatch.fgBatchId,
        productName: fgBatch.productName,
        currentStatus: {
          stationName: fgBatch.station.name,
          availableQty: Number(fgBatch.availableQty),
          initialQty: Number(fgBatch.initialQty),
          costPerKg: Number(fgBatch.costPerKg),
          qualityStatus: fgBatch.qualityStatus,
          productionDate: fgBatch.productionDate.toISOString(),
          expiryDate: fgBatch.expiryDate ? fgBatch.expiryDate.toISOString() : null,
        },
        upstreamOperation: fgBatch.operation
          ? {
              operationId: fgBatch.operation.id,
              date: fgBatch.operation.date.toISOString(),
              contractorName: fgBatch.operation.contractor.name,
              stationName: fgBatch.operation.station.name,
              rawInputKg: Number(fgBatch.operation.rawInputKg),
              finishedOutputKg: Number(fgBatch.operation.finishedOutputKg),
              rawWasteKg: Number(fgBatch.operation.rawWasteKg),
              yieldPercent: Number(fgBatch.operation.yieldPercent),
              inputRawBatches: fgBatch.operation.rawIssues.map((ri) => ({
                batchId: ri.batchId,
                rawProduct: ri.rawBatch?.rawProduct || 'خام زراعي',
                qtyKg: Number(ri.qtyKg),
                unitCost: Number(ri.unitCost),
                supplierName: ri.rawBatch?.supplier?.name || ri.supplierName,
                supplierId: ri.rawBatch?.supplier?.id,
              })),
              suppliesConsumed: fgBatch.operation.supplyIssues.map((si) => ({
                supplyName: si.supply.name,
                unit: si.supply.unit,
                consumedQty: Number(si.consumedQty),
                wasteQty: Number(si.wasteQty),
              })),
            }
          : null,
        transfers: transfers.map((t) => ({
          transferId: t.transferId,
          date: t.date.toISOString(),
          fromStation: t.fromStation.name,
          toStation: t.toStation.name,
          qtyKg: Number(t.qtyKg),
          truckPlate: t.truckPlate,
          driverName: t.driverName,
        })),
        movements: fgBatch.stockMovements.map((m) => ({
          movementNo: m.movementNo,
          movementType: m.movementType,
          date: m.createdAt.toISOString(),
          qty: Number(m.qty),
          unit: m.unit,
          from: m.sourceLocation?.name || 'تصنيع / تشغيل',
          to: m.destinationLocation?.name || 'شحن / عميل',
          notes: m.notes,
          user: m.createdBy?.fullName || 'النظام',
        })),
        shipments: fgBatch.allocatedShipments.map((alloc) => ({
          shipmentId: alloc.shipment.shipmentId,
          status: alloc.shipment.status,
          dispatchDate: alloc.shipment.dispatchDate
            ? alloc.shipment.dispatchDate.toISOString()
            : null,
          containerNo: alloc.shipment.containerNo,
          sealNo: alloc.shipment.sealNo,
          customerName:
            alloc.shipment.customer?.name || alloc.shipment.order?.customer?.name || 'عميل تصدير',
          shippedQtyKg: Number(alloc.qtyKg),
        })),
      };
    }

    return {
      success: false,
      error: `لم يتم العثور على أي لوط خام أو باتش جاهز برقم: "${query}"`,
    };
  } catch (error: any) {
    console.error('Failed to get lot traceability:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء استخراج شجرة تتبع اللوط',
    };
  }
}

/**
 * Closed-Loop Stock Adjustment Server Action
 * Executes an atomic inventory balance adjustment with StockAdjustment, StockMovement, and AuditLog
 */
export async function createStationStockAdjustment(payload: {
  stationId: string;
  targetType: 'RAW_LOT' | 'FINISHED_BATCH' | 'SUPPLY';
  targetId: string;
  actualQty: number;
  reason: string;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'CREATE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بإجراء تسويات جردية للمخزون' };
  }

  const { stationId, targetType, targetId, actualQty, reason } = payload;

  if (actualQty === undefined || actualQty === null || isNaN(actualQty) || actualQty < 0) {
    return { success: false, error: 'الكمية الفعلية بعد الجرد يجب أن تكون رقماً موجباً أو صفراً' };
  }

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'يرجى كتابة سبب التسوية المخزنية بالتفصيل (5 أحرف على الأقل)' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify Station Exists
      const station = await tx.station.findUnique({
        where: { id: stationId },
        include: { stockLocations: true },
      });
      if (!station) throw new Error('المحطة المحددة غير موجودة');

      let systemQty = 0;
      let itemUnit = 'KG';
      let warehouseType: WarehouseType = WarehouseType.RAW;
      let locationId = '';
      let targetName = targetId;

      // 2. Read Target and verify Station Isolation
      if (targetType === 'RAW_LOT') {
        const batch = await tx.rawBatch.findUnique({ where: { batchId: targetId } });
        if (!batch) throw new Error(`لوط الخام (${targetId}) غير مسجل بالنظام`);
        if (batch.stationId !== stationId) {
          throw new Error(`اللوط (${targetId}) يتبع محطة أخرى ولا يتبع المحطة الحالية`);
        }
        systemQty = Number(batch.availableQty);
        itemUnit = 'KG';
        warehouseType = WarehouseType.RAW;
        locationId =
          batch.locationId ||
          station.stockLocations.find((l) => l.type === WarehouseType.RAW)?.id ||
          '';
        targetName = `${batch.rawProduct} (لوط: ${batch.batchId})`;

        // Atomic update of available quantity
        await tx.rawBatch.update({
          where: { batchId: targetId },
          data: { availableQty: actualQty },
        });
      } else if (targetType === 'FINISHED_BATCH') {
        const batch = await tx.finishedGoodsBatch.findUnique({ where: { fgBatchId: targetId } });
        if (!batch) throw new Error(`الباتش التام (${targetId}) غير مسجل بالنظام`);
        if (batch.stationId !== stationId) {
          throw new Error(`الباتش (${targetId}) يتبع محطة أخرى ولا يتبع المحطة الحالية`);
        }
        systemQty = Number(batch.availableQty);
        itemUnit = 'KG';
        warehouseType = WarehouseType.FINISHED;
        locationId =
          batch.locationId ||
          station.stockLocations.find((l) => l.type === WarehouseType.FINISHED)?.id ||
          '';
        targetName = `${batch.productName} (باتش: ${batch.fgBatchId})`;

        await tx.finishedGoodsBatch.update({
          where: { fgBatchId: targetId },
          data: { availableQty: actualQty },
        });
      } else if (targetType === 'SUPPLY') {
        const suppliesLoc = station.stockLocations.find((l) => l.type === WarehouseType.SUPPLIES);
        if (!suppliesLoc) throw new Error('مخزن المستلزمات الخاص بالمحطة غير مهيأ');
        locationId = suppliesLoc.id;

        const supply = await tx.supply.findUnique({ where: { id: targetId } });
        if (!supply) throw new Error(`مستلزم التعبئة (${targetId}) غير مسجل`);
        itemUnit = supply.unit;
        warehouseType = WarehouseType.SUPPLIES;
        targetName = supply.name;

        const ss = await tx.stationSupply.findUnique({
          where: { locationId_supplyId: { locationId: suppliesLoc.id, supplyId: targetId } },
        });
        systemQty = ss ? Number(ss.stock) : 0;

        await tx.stationSupply.upsert({
          where: { locationId_supplyId: { locationId: suppliesLoc.id, supplyId: targetId } },
          update: { stock: actualQty },
          create: { locationId: suppliesLoc.id, supplyId: targetId, stock: actualQty },
        });
      }

      const differenceQty = Math.round((actualQty - systemQty) * 100) / 100;
      if (Math.abs(differenceQty) < 0.001) {
        throw new Error('الرصيد الفعلي يطابق الرصيد الدفتري الحالي تماماً، لا توجد تسوية مطلوبة');
      }

      // 3. Create StockAdjustment Record
      const dateStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
      const count = await tx.stockAdjustment.count();
      const adjustmentId = `ADJ-${dateStr}-${String(count + 1).padStart(3, '0')}`;

      await tx.stockAdjustment.create({
        data: {
          adjustmentId,
          date: new Date(),
          stationId,
          targetType,
          targetId,
          systemQty,
          actualQty,
          differenceQty,
          reason: reason.trim(),
          approvedById: user.id,
        },
      });

      // 4. Log Immutable StockMovement Audit Ledger Entry
      const absDiff = Math.abs(differenceQty);
      await logStockMovement(tx, {
        movementType: 'ADJUSTMENT',
        sourceLocationId: differenceQty < 0 ? locationId : null,
        destinationLocationId: differenceQty > 0 ? locationId : null,
        itemType: warehouseType,
        rawBatchId: targetType === 'RAW_LOT' ? targetId : null,
        fgBatchId: targetType === 'FINISHED_BATCH' ? targetId : null,
        supplyId: targetType === 'SUPPLY' ? targetId : null,
        qty: absDiff,
        unit: itemUnit,
        referenceType: 'STOCK_ADJUSTMENT',
        referenceId: adjustmentId,
        notes: `تسوية جردية رسمية (${adjustmentId}): الفرق ${differenceQty > 0 ? '+' : ''}${differenceQty} ${itemUnit} — السبب: ${reason}`,
        createdById: user.id,
      });

      // 5. Log Audit Trail
      await tx.auditLog.create({
        data: {
          entityType: 'station_inventory',
          entityId: targetId,
          action: 'ADJUSTMENT',
          summary: `تسوية مخزنية بالمحطة ${station.name}: تعديل رصيد ${targetName} من ${systemQty} إلى ${actualQty} (${differenceQty > 0 ? '+' : ''}${differenceQty} ${itemUnit}) — السبب: ${reason}`,
          performedBy: user.id,
        },
      });

      return {
        adjustmentId,
        systemQty,
        actualQty,
        differenceQty,
        itemUnit,
        targetName,
      };
    });

    safeRevalidatePath(`/stations/${stationId}`);
    safeRevalidatePath('/stations');
    safeRevalidatePath('/inventory');

    return {
      success: true,
      message: `تمت التسوية بنجاح برقم ${result.adjustmentId}: تم تعديل رصيد ${result.targetName} إلى ${result.actualQty.toLocaleString()} ${result.itemUnit} (الفارق: ${result.differenceQty > 0 ? '+' : ''}${result.differenceQty})`,
      data: result,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error) };
  }
}

export async function updateStation(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بتعديل المحطات' };
  }

  const rawData = Object.fromEntries(formData);
  const validated = StationSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  try {
    const station = await prisma.station.update({
      where: { id },
      data: validated.data,
    });
    revalidateTag('stations');
    revalidatePath('/stations');
    safeRevalidatePath(`/stations/${id}`);
    return { success: true, message: `تم تعديل بيانات المحطة ${station.name} بنجاح` };
  } catch (error: any) {
    return { success: false, error: error.message || 'حدث خطأ أثناء تعديل بيانات المحطة' };
  }
}

export async function deleteStation(id: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بحذف المحطات' };
  }

  try {
    const rawBatchesCount = await prisma.rawBatch.count({ where: { stationId: id } });
    const fgBatchesCount = await prisma.finishedGoodsBatch.count({ where: { stationId: id } });
    const opsCount = await prisma.processingOperation.count({ where: { stationId: id } });

    const locations = await prisma.stockLocation.findMany({ where: { stationId: id }, select: { id: true } });
    const locIds = locations.map((l) => l.id);

    const movementsCount =
      locIds.length > 0
        ? await prisma.stockMovement.count({
            where: {
              OR: [
                { sourceLocationId: { in: locIds } },
                { destinationLocationId: { in: locIds } },
              ],
            },
          })
        : 0;

    if (rawBatchesCount > 0 || fgBatchesCount > 0 || opsCount > 0 || movementsCount > 0) {
      await prisma.station.update({
        where: { id },
        data: { isActive: false },
      });
      revalidateTag('stations');
      revalidatePath('/stations');
      return {
        success: true,
        message: 'تم إيقاف المحطة وإرشفتها بنجاح للحفاظ على سجلات وسجلات الحركة التاريخية',
      };
    }

    await prisma.station.delete({
      where: { id },
    });
    revalidateTag('stations');
    revalidatePath('/stations');
    return { success: true, message: 'تم حذف المحطة بنجاح' };
  } catch (error: any) {
    if (error.code === 'P2003') {
      return {
        success: false,
        error: 'لا يمكن حذف المحطة لكونها مرتبطة بعمليات تشغيل أو رصيد مخزني أو حركة مخزنية',
      };
    }
    return { success: false, error: error.message || 'حدث خطأ أثناء حذف المحطة' };
  }
}
