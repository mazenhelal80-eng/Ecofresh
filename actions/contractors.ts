"use server";

import { safeRevalidatePath } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import { ContractorSchema } from '@/lib/validations/contractor';
import { generateContractorId } from '@/lib/id-generator';

export async function createContractor(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بإضافة مقاولين' };
  }

  const rawData = Object.fromEntries(formData);
  const validated = ContractorSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  try {
    const contractor = await prisma.$transaction(async (tx) => {
      const generatedId = validated.data.id || (await generateContractorId(tx));

      return await tx.contractor.create({
        data: {
          ...validated.data,
          id: generatedId,
        },
      });
    });

    safeRevalidatePath('/contractors');
    return {
      success: true,
      message: `تم تسجيل المقاول ${contractor.name} (${contractor.id}) بتعريفة ${contractor.tariffRatePerKg} ج.م/كجم`,
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'كود المقاول مسجل مسبقاً' };
    }
    return { success: false, error: error.message || 'حدث خطأ أثناء حفظ بيانات المقاول' };
  }
}

export async function getContractors() {
  try {
    const contractors = await prisma.contractor.findMany({
      include: {
        operations: {
          select: {
            stationId: true,
            finishedOutputKg: true,
            contractorCost: true,
            station: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return contractors.map((c) => {
      const stationMap = new Map<string, { id: string; name: string }>();
      let totalKg = 0;
      let totalCost = 0;
      for (const op of c.operations) {
        if (op.station) {
          stationMap.set(op.station.id, op.station);
        }
        totalKg += Number(op.finishedOutputKg || 0);
        totalCost += Number(op.contractorCost || 0);
      }

      return {
        ...c,
        tariffRatePerKg: Number(c.tariffRatePerKg),
        operationsCount: c.operations.length,
        totalOutputKg: totalKg,
        totalCost: totalCost,
        stations: Array.from(stationMap.values()),
      };
    });
  } catch (error) {
    console.error('Failed to fetch contractors:', error);
    return [];
  }
}

export async function getStationsForSelect() {
  try {
    return await prisma.station.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        location: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (error) {
    console.error('Failed to fetch stations:', error);
    return [];
  }
}

export async function updateContractor(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بتعديل المقاولين' };
  }

  const rawData = Object.fromEntries(formData);
  const validated = ContractorSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  try {
    const contractor = await prisma.contractor.update({
      where: { id },
      data: validated.data,
    });
    safeRevalidatePath('/contractors');
    return { success: true, message: `تم تعديل بيانات المقاول ${contractor.name} بنجاح` };
  } catch (error: any) {
    return { success: false, error: error.message || 'حدث خطأ أثناء تعديل المقاول' };
  }
}

export async function deleteContractor(id: string) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بحذف المقاولين' };
  }

  try {
    await prisma.contractor.delete({
      where: { id },
    });
    safeRevalidatePath('/contractors');
    return { success: true, message: 'تم حذف المقاول بنجاح' };
  } catch (error: any) {
    if (error.code === 'P2003') {
      return { success: false, error: 'لا يمكن حذف المقاول لأنه مرتبط بعمليات تصنيع سابقة' };
    }
    return { success: false, error: error.message || 'حدث خطأ أثناء حذف المقاول' };
  }
}

