import { z } from 'zod';
import {
  cleanPositiveNumber,
  cleanNonNegativeNumber,
  cleanOptionalNumber,
} from './common';

export const DirectDealSchema = z
  .object({
    supplierId: z.string().min(1, 'يجب اختيار المورد'),
    stationId: z.string().min(1, 'يجب اختيار المحطة المستقبلة'),
    productName: z.string().min(2, 'اسم البضاعة الجاهزة مطلوب (مثل: فراولة مجمدة 10 كجم)'),
    qtyKg: cleanPositiveNumber('الكمية (كجم) يجب أن تكون أكبر من 0'),
    purchasePricePerKg: cleanPositiveNumber('سعر شراء الكيلو يجب أن يكون أكبر من 0'),
    transportCost: cleanNonNegativeNumber('النولون لا يمكن أن يكون سالباً', 0),
    packageType: z.string().optional().nullable(),
    packageCount: z.preprocess(
      (v) => (v === '' ? null : v),
      z.coerce.number().int().min(0).optional().nullable()
    ),
    submissionId: z.string().optional().nullable(),
    invoiceNo: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    // Instant Payment fields (optional)
    isPaidNow: z.boolean().default(false).optional(),
    paidAmount: cleanNonNegativeNumber('المبلغ المدفوع لا يمكن أن يكون سالباً', 0),
    treasuryAccountId: z.string().optional().nullable(),
    // Derived fields (optional in input, automatically computed in output)
    totalCost: cleanOptionalNumber(),
    costPerKg: cleanOptionalNumber(),
  })
  .refine(
    (data) => {
      if ((data.isPaidNow || (data.paidAmount && data.paidAmount > 0)) && !data.treasuryAccountId) {
        return false;
      }
      return true;
    },
    {
      message: 'يجب اختيار حساب الخزينة أو البنك المسدد منه عند تسجيل سداد فوري',
      path: ['treasuryAccountId'],
    }
  )
  .refine(
    (data) => {
      const rawCost = data.qtyKg * data.purchasePricePerKg;
      const total = Math.round((rawCost + (data.transportCost || 0)) * 100) / 100;
      if (data.paidAmount && data.paidAmount > total + 0.01) {
        return false;
      }
      return true;
    },
    {
      message: 'المبلغ المسدد لا يمكن أن يتجاوز إجمالي قيمة الصفقة',
      path: ['paidAmount'],
    }
  )
  .transform((data) => {
    const rawCost = data.qtyKg * data.purchasePricePerKg;
    const totalCost = Math.round((rawCost + (data.transportCost || 0)) * 100) / 100;
    const costPerKg = data.qtyKg > 0 ? Math.round((totalCost / data.qtyKg) * 100) / 100 : 0;
    const effectivePaid = data.paidAmount || 0;
    const remainingAmount = Math.max(0, Math.round((totalCost - effectivePaid) * 100) / 100);

    return {
      ...data,
      totalCost: data.totalCost ?? totalCost,
      costPerKg: data.costPerKg ?? costPerKg,
      paidAmount: effectivePaid,
      remainingAmount,
    };
  });

export type DirectDealFormValues = z.infer<typeof DirectDealSchema>;
export type DirectDealInput = z.input<typeof DirectDealSchema>;
export type DirectDealOutput = z.output<typeof DirectDealSchema>;
