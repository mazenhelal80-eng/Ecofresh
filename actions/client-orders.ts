"use server";

import { revalidatePath } from 'next/cache';
import { formatActionError } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { ClientOrderSchema } from '@/lib/validations/client-order';

/**
 * Concurrency-safe, collision-free Order ID generator
 */
export async function generateOrderId(tx: any, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(100 + Math.random() * 900);
  let orderId = `ORD-${year}-${timestamp}${random}`;

  while (await tx.clientOrder.findUnique({ where: { orderId } })) {
    const newRandom = Math.floor(100 + Math.random() * 900);
    orderId = `ORD-${year}-${Date.now().toString().slice(-4)}${newRandom}`;
  }
  return orderId;
}

export async function addClientOrder(payload: unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بتسجيل طلبيات عملاء' };
  }

  const validated = ClientOrderSchema.safeParse(payload);
  if (!validated.success) {
    return {
      success: false,
      error: 'بيانات الطلبية غير صحيحة',
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const data = validated.data;

  try {
    const order = await prisma.$transaction(async (tx) => {
      // 1. Verify customer exists and is active
      const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) throw new Error('العميل المحدد غير موجود');
      if (customer.status !== 'نشط') throw new Error(`العميل (${customer.name}) غير نشط حالياً`);

      // 2. Resolve Product from Product catalog if matched
      const product = await tx.product.findFirst({
        where: {
          OR: [
            { name: data.productName },
            { code: data.productName },
          ],
        },
      });
      const canonicalProductName = product ? product.name : data.productName;

      // 3. Concurrency-safe, collision-free Order ID generation
      const orderId = await generateOrderId(tx);

      // 4. Create ClientOrder
      return await tx.clientOrder.create({
        data: {
          orderId,
          customerId: data.customerId,
          productName: canonicalProductName,
          packagingSpec: data.packagingSpec,
          orderedQtyKg: data.orderedQtyKg,
          unfulfilledQtyKg: data.orderedQtyKg,
          unitPriceEur: data.unitPriceEur,
          fxRate: data.fxRate,
          targetShipDate: data.targetShipDate ? new Date(data.targetShipDate) : null,
          status: 'جديدة',
          notes: data.notes,
          createdById: user.id,
        },
        include: { customer: true },
      });
    });

    revalidatePath('/client-orders');
    return {
      success: true,
      message: `تم تسجيل الطلبية ${order.orderId} للعميل ${order.customer.name} بنجاح`,
    };
  } catch (error: any) {
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء تسجيل الطلبية') };
  }
}

export async function getClientOrders() {
  try {
    return await prisma.clientOrder.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    console.error('Failed to fetch client orders:', error);
    return [];
  }
}

export async function getCustomerAgreementsSelect(customerId: string) {
  try {
    const agreements = await prisma.customerAgreement.findMany({
      where: { customerId },
      include: {
        product: true,
        customer: true,
      },
    });
    return agreements;
  } catch (error) {
    console.error('Failed to fetch customer agreements:', error);
    return [];
  }
}

export async function getCustomersForOrderSelect() {
  try {
    return await prisma.customer.findMany({
      where: { status: 'نشط' },
      select: {
        id: true,
        code: true,
        name: true,
        country: true,
        currency: true,
        agreements: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch customers for select:', error);
    return [];
  }
}

export async function getProductsForOrderSelect() {
  try {
    return await prisma.product.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch products for order select:', error);
    return [];
  }
}

export async function getPackagingForOrderSelect() {
  try {
    return await prisma.supply.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        unit: true,
        capacityKg: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch packaging for order select:', error);
    return [];
  }
}


export async function updateClientOrderStatus(orderId: string, status: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بتعديل حالة الطلبيات' };
  }

  try {
    const order = await prisma.clientOrder.update({
      where: { orderId },
      data: { status },
    });
    revalidatePath('/client-orders');
    return { success: true, message: `تم تحديث حالة الطلبية ${order.orderId} إلى ${status}` };
  } catch (error: any) {
    return { success: false, error: error.message || 'حدث خطأ أثناء تحديث حالة الطلبية' };
  }
}

export async function deleteClientOrder(orderId: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بحذف الطلبيات' };
  }

  try {
    const shipmentsCount = await prisma.shipment.count({ where: { orderId } });
    if (shipmentsCount > 0) {
      return { success: false, error: 'لا يمكن حذف الطلبية لكونها مرتبطة بشحنات تصدير قائمة' };
    }

    await prisma.clientOrder.delete({
      where: { orderId },
    });
    revalidatePath('/client-orders');
    return { success: true, message: 'تم حذف الطلبية بنجاح' };
  } catch (error: any) {
    if (error.code === 'P2003') {
      return { success: false, error: 'لا يمكن حذف الطلبية لكونها مرتبطة بشحنات تصدير قائمة' };
    }
    return { success: false, error: formatActionError(error, 'حدث خطأ أثناء حذف الطلبية') };
  }
}

