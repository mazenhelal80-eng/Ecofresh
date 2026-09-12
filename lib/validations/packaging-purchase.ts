import { z } from 'zod';
import {
  cleanPositiveNumber,
  cleanOptionalNumber,
} from './common';

export const PackagingPurchaseSchema = z
  .object({
    stationId: z.string().min(1, 'يجب اختيار المحطة المستلمة للمستلزمات'),
    supplyId: z.string().min(1, 'يجب اختيار المستلزم'),
    supplierId: z.string().min(1, 'يجب اختيار المورد'),
    qty: cleanPositiveNumber('الكمية يجب أن تكون أكبر من 0'),
    unitPrice: cleanPositiveNumber('سعر الوحدة يجب أن يكون أكبر من 0'),
    invoiceNo: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    submissionId: z.string().optional().nullable(),
    // Derived fields (optional in input, automatically computed in output)
    totalCost: cleanOptionalNumber(),
  })
  .transform((data) => {
    const totalCost = Number((data.qty * data.unitPrice).toFixed(4));

    return {
      ...data,
      totalCost: data.totalCost ?? totalCost,
    };
  });

export type PackagingPurchaseFormValues = z.infer<typeof PackagingPurchaseSchema>;
export type PackagingPurchaseInput = z.input<typeof PackagingPurchaseSchema>;
export type PackagingPurchaseOutput = z.output<typeof PackagingPurchaseSchema>;
