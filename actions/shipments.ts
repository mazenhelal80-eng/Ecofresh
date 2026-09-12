"use server";

import { safeRevalidatePath } from '@/lib/utils';
import { formatActionError } from '@/lib/error-handler';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { ShipmentSchema } from '@/lib/validations/shipment';
import { logStockMovement } from '@/lib/stock-service';
import { WarehouseType } from '@prisma/client';
import { formatCurrency } from '@/lib/currency';

/**
 * Concurrency-safe, collision-free Shipment ID generator
 */
export async function generateShipmentId(tx: any, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(100 + Math.random() * 900);
  let shipmentId = `SHP-${year}-${timestamp}${random}`;

  while (await tx.shipment.findUnique({ where: { shipmentId } })) {
    const newRandom = Math.floor(100 + Math.random() * 900);
    shipmentId = `SHP-${year}-${Date.now().toString().slice(-4)}${newRandom}`;
  }
  return shipmentId;
}

export async function createShipment(payload: unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'DISPATCH_SHIPMENT')) {
    return { success: false, error: 'غير مصرح لك باعتماد شحنات تصدير' };
  }

  const validated = ShipmentSchema.safeParse(payload);
  if (!validated.success) {
    return { success: false, error: 'بيانات الشحنة غير صحيحة', errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const dispatchDate = data.dispatchDate ? new Date(data.dispatchDate) : new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. فحص طلبية العميل
      const order = await tx.clientOrder.findUnique({
        where: { orderId: data.orderId },
        include: { customer: true },
      });

      if (!order) throw new Error(`طلبية العميل ${data.orderId} غير مسجلة`);

      // 2. التحقق من الباتشات المخصصة وخصم رصيدها
      let shippedQty = 0;
      let totalProdCost = 0;
      const allocatedBatchesData: any[] = [];

      for (const item of data.allocatedBatches) {
        const batch = await tx.finishedGoodsBatch.findUnique({ where: { fgBatchId: item.fgBatchId } });
        if (!batch) throw new Error(`الباتش ${item.fgBatchId} غير موجود بالمخزن`);

        if (batch.productName !== order.productName) {
          throw new Error(`منتج الباتش (${batch.productName}) لا يطابق منتج الطلبية (${order.productName})`);
        }

        const available = Number(batch.availableQty);
        if (item.qty > available) {
          throw new Error(`الكمية المخصصة من الباتش ${item.fgBatchId} (${item.qty} كجم) تتجاوز الرصيد المتاح بالمخزن (${available} كجم)`);
        }

        // خصم رصيد الباتش بحراسة تفاؤلية تمنع الرصيد السالب
        const decResult = await tx.finishedGoodsBatch.updateMany({
          where: {
            fgBatchId: item.fgBatchId,
            availableQty: { gte: item.qty },
          },
          data: {
            availableQty: { decrement: item.qty },
          },
        });

        if (decResult.count === 0) {
          throw new Error(`تعذر تخصيص الكمية من الباتش ${item.fgBatchId} نظراً لتغير الرصيد أثناء المعالجة المتزامنة`);
        }

        // تسجيل حركة صرف شحن للخارج
        if (batch.locationId) {
          await logStockMovement(tx, {
            movementType: 'SHIPMENT',
            sourceLocationId: batch.locationId,
            destinationLocationId: null,
            itemType: WarehouseType.FINISHED,
            fgBatchId: item.fgBatchId,
            qty: item.qty,
            unit: 'KG',
            referenceType: 'SHIPMENT',
            notes: `صرف شحنة تصدير للعميل (${order.customer?.name || 'عميل'})`,
            createdById: user.id,
          });
        }

        const costPerKg = Number(batch.costPerKg);
        const itemTotalCost = item.qty * costPerKg;
        shippedQty += item.qty;
        totalProdCost += itemTotalCost;

        allocatedBatchesData.push({
          fgBatchId: item.fgBatchId,
          qtyKg: item.qty,
          costPerKg: costPerKg,
          totalCostEgp: itemTotalCost,
        });
      }

      // 3. التحقق من كمية الطلبية المتبقية
      const orderUnfulfilled = Number(order.unfulfilledQtyKg);
      if (shippedQty > orderUnfulfilled) {
        throw new Error(`إجمالي كمية الشحنة (${shippedQty} كجم) يتجاوز المتبقي بالطلبية (${orderUnfulfilled} كجم)`);
      }

      // 4. تحديث رصيد وحالة الطلبية
      const remainingUnfulfilled = orderUnfulfilled - shippedQty;
      await tx.clientOrder.update({
        where: { orderId: order.orderId },
        data: {
          unfulfilledQtyKg: remainingUnfulfilled,
          status: remainingUnfulfilled === 0 ? 'مكتملة بالكامل' : 'مشحونة جزئياً',
        },
      });

      // 5. الحسابات المالية والربحية
      const inlandTrucking = data.costs?.inlandTrucking ?? 6500;
      const oceanFreight = data.costs?.oceanFreight ?? 22000;
      const customsClearance = data.costs?.customsClearance ?? 4500;
      const inspectionCertificates = data.costs?.inspectionCertificates ?? 2500;
      const portTerminalCharges = data.costs?.portTerminalCharges ?? 3500;

      const totalOverhead = inlandTrucking + oceanFreight + customsClearance + inspectionCertificates + portTerminalCharges;
      const totalShipmentCost = totalProdCost + totalOverhead;

      const sellingPriceEur = Number(order.unitPriceEur);
      const fxRate = Number(order.fxRate);
      const grossRevenueEgp = shippedQty * sellingPriceEur * fxRate;
      const netProfitEgp = grossRevenueEgp - totalShipmentCost;
      const marginPercent = grossRevenueEgp > 0 ? (netProfitEgp / grossRevenueEgp) * 100 : 0;

      // توليد كود الشحنة بطريقة آمنة تزامناً
      const shipmentId = await generateShipmentId(tx, dispatchDate);

      // 6. إنشاء سجل الشحنة وسجلات التخصيص
      await tx.shipment.create({
        data: {
          shipmentId,
          orderId: order.orderId,
          customerId: order.customerId,
          productName: order.productName,
          dispatchDate,
          containerNo: data.containerNo,
          sealNo: data.sealNo,
          shippingLine: data.shippingLine,
          bookingNo: data.bookingNo,
          shippedQtyKg: shippedQty,
          productionCostEgp: totalProdCost,
          inlandTruckingEgp: inlandTrucking,
          oceanFreightEgp: oceanFreight,
          customsClearanceEgp: customsClearance,
          inspectionCertificatesEgp: inspectionCertificates,
          portTerminalChargesEgp: portTerminalCharges,
          totalShipmentCostEgp: totalShipmentCost,
          sellingPriceEur,
          fxRate,
          grossRevenueEgp,
          netProfitEgp,
          marginPercent,
          status: 'تم الشحن والإبحار',
          createdById: user.id,
          allocatedBatches: {
            create: allocatedBatchesData.map((b) => ({
              fgBatchId: b.fgBatchId,
              qtyKg: b.qtyKg,
              costPerKg: b.costPerKg,
              totalCostEgp: b.totalCostEgp,
            })),
          },
        },
      });

      // 7. توليد فاتورة العميل التجارية (AR) تلقائياً في دفتر الأستاذ via AccountingService
      const { AccountingService } = await import('@/lib/accounting/accounting-service');
      await AccountingService.recordTransaction(
        {
          date: dispatchDate,
          type: 'استحقاق مبيعات تصدير (AR)',
          partyType: 'عميل تصدير',
          partyId: order.customerId,
          partyName: order.customer.name,
          amountEgp: grossRevenueEgp,
          amountCurrency: null,
          currency: 'EGP',
          relatedEntityType: 'SHIPMENT',
          relatedEntityId: shipmentId,
          refDoc: shipmentId,
          paymentMethod: 'CREDIT',
          description: `فاتورة تصدير الشحنة ${shipmentId} للحاوية ${data.containerNo} للعميل ${order.customer.name}`,
          createdById: user.id,
        },
        tx
      );

      return { shipmentId, netProfitEgp, marginPercent, grossRevenueEgp, customerId: order.customerId };
    });

    const { revalidateFinancialImpact } = await import('@/actions/financials');
    await revalidateFinancialImpact('عميل تصدير', result.customerId);
    revalidatePath('/shipments');
    revalidatePath('/inventory');
    revalidatePath('/client-orders');

    return {
      success: true,
      data: result,
      message: `تم اعتماد الشحنة ${result.shipmentId} بربح ${formatCurrency(result.netProfitEgp)} (هامش ${result.marginPercent.toFixed(1)}%) وتوليد فاتورة العميل!`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء اعتماد الشحنة') };
  }
}

export async function getShipmentWizardData() {
  try {
    const [clientOrders, finishedGoodsBatches] = await Promise.all([
      prisma.clientOrder.findMany({
        where: { unfulfilledQtyKg: { gt: 0 } },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.finishedGoodsBatch.findMany({
        where: { availableQty: { gt: 0 } },
        include: { station: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      success: true,
      clientOrders: JSON.parse(JSON.stringify(clientOrders)),
      finishedGoodsBatches: JSON.parse(JSON.stringify(finishedGoodsBatches)),
    };
  } catch (error: any) {
    console.error('Failed to fetch shipment wizard data:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء تحميل بيانات معالج الشحنات',
      clientOrders: [],
      finishedGoodsBatches: [],
    };
  }
}

export async function getShipmentsDataPaginated(page: number = 1, pageSize: number = 25) {
  try {
    const skip = (page - 1) * pageSize;
    const [clientOrders, totalCount, finishedGoodsBatches] = await Promise.all([
      prisma.clientOrder.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.clientOrder.count(),
      prisma.finishedGoodsBatch.findMany({
        where: { availableQty: { gt: 0 } },
        include: { station: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      clientOrders: JSON.parse(JSON.stringify(clientOrders)),
      finishedGoodsBatches: JSON.parse(JSON.stringify(finishedGoodsBatches)),
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      page,
      pageSize,
    };
  } catch (error: any) {
    console.error('Failed to fetch paginated shipments data:', error);
    return {
      clientOrders: [],
      finishedGoodsBatches: [],
      totalCount: 0,
      totalPages: 0,
      page,
      pageSize,
    };
  }
}

export async function getShipmentsData() {
  try {
    const [clientOrders, finishedGoodsBatches] = await Promise.all([
      prisma.clientOrder.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.finishedGoodsBatch.findMany({
        where: { availableQty: { gt: 0 } },
        include: { station: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      success: true,
      clientOrders: JSON.parse(JSON.stringify(clientOrders)),
      finishedGoodsBatches: JSON.parse(JSON.stringify(finishedGoodsBatches)),
    };
  } catch (error: any) {
    console.error('Failed to fetch shipments data:', error);
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء تحميل بيانات الشحنات',
      clientOrders: [],
      finishedGoodsBatches: [],
    };
  }
}

export async function cancelShipment(shipmentId: string, cancelReason: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'DELETE_OPERATION')) {
    return { success: false, error: 'غير مصرح لك بإلغاء أو عكس الشحنات' };
  }

  if (!cancelReason || cancelReason.trim().length < 5) {
    return { success: false, error: 'يرجى كتابة سبب الإلغاء بالتفصيل (5 أحرف على الأقل)' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { shipmentId },
        include: {
          allocatedBatches: true,
          order: true,
        },
      });

      if (!shipment) throw new Error('الشحنة غير موجودة');
      if (shipment.status === 'CANCELLED') throw new Error('الشحنة ملغاة بالفعل مسبقاً');

      // 🚨 CRITICAL BUSINESS CUTOFF RULE (NON-NEGOTIABLE):
      // Once a shipment has physically departed the station / port (status 'تم الشحن والإبحار' and dispatchDate is reached),
      // direct cancellation is strictly forbidden even for Admins. A formal Export Return Voucher must be used instead.
      // Shipments in preparation ('قيد التجهيز بالمحطة') or un-dispatched can be safely cancelled and reversed.
      const isPhysicallyDispatched =
        shipment.status === 'تم الشحن والإبحار' &&
        shipment.dispatchDate !== null &&
        new Date(shipment.dispatchDate) <= new Date();

      if (isPhysicallyDispatched) {
        throw new Error('لا يمكن إلغاء شحنة خرجت وأبحرت بالفعل من المحطة. استخدم سند مرتجع تصدير بدلاً من ذلك.');
      }

      const shippedQty = Number(shipment.shippedQtyKg);

      // 1. Restore allocated Finished Goods Batches & log reversal movements
      for (const alloc of shipment.allocatedBatches) {
        const batch = await tx.finishedGoodsBatch.findUnique({ where: { fgBatchId: alloc.fgBatchId } });
        const restoreQty = Number(alloc.qtyKg);

        await tx.finishedGoodsBatch.update({
          where: { fgBatchId: alloc.fgBatchId },
          data: { availableQty: { increment: restoreQty } },
        });

        if (batch && batch.locationId) {
          await logStockMovement(tx, {
            movementType: 'REVERSAL_IN',
            sourceLocationId: null,
            destinationLocationId: batch.locationId,
            itemType: WarehouseType.FINISHED,
            fgBatchId: alloc.fgBatchId,
            qty: restoreQty,
            unit: 'KG',
            referenceType: 'SHIPMENT_REVERSAL',
            referenceId: shipment.shipmentId,
            notes: `إرجاع رصيد تصدير نتيجة إلغاء الشحنة ${shipment.shipmentId}: ${cancelReason}`,
            createdById: user.id,
          });
        }
      }

      // 2. Revert unfulfilled quantity on ClientOrder
      const currentUnfulfilled = Number(shipment.order.unfulfilledQtyKg);
      const newUnfulfilled = currentUnfulfilled + shippedQty;
      await tx.clientOrder.update({
        where: { orderId: shipment.orderId },
        data: {
          unfulfilledQtyKg: newUnfulfilled,
          status: 'قيد التنفيذ',
        },
      });

      // 3. Cancel Financial Transaction (AR Invoice)
      const existingTxn = await tx.financialTransaction.findFirst({
        where: { refDoc: shipment.shipmentId, type: 'استحقاق مبيعات تصدير (AR)' },
      });

      if (existingTxn) {
        await tx.financialTransaction.update({
          where: { txnId: existingTxn.txnId },
          data: { status: 'ملغاة' },
        });
      }

      // 4. Update Shipment status to CANCELLED with race condition protection
      const updatedShipment = await tx.shipment.updateMany({
        where: {
          shipmentId: shipment.shipmentId,
          status: { not: 'CANCELLED' },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledById: user.id,
          cancelReason,
        },
      });

      if (updatedShipment.count === 0) {
        throw new Error('تم إلغاء الشحنة بالفعل بواسطة طلب آخر متزامن');
      }

      return { shipmentId: shipment.shipmentId };
    }, { timeout: 10000 });

    safeRevalidatePath('/shipments');
    safeRevalidatePath('/client-orders');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/financials');

    return {
      success: true,
      message: `تم بنجاح إلغاء وعكس الشحنة ${result.shipmentId} واستعادة رصيد المنتج التام وإعادة فتح طلبية العميل`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء إلغاء الشحنة') };
  }
}
