import { z } from 'zod';
import {
  cleanPositiveNumber,
  cleanOptionalNumber,
} from './common';

export const ClientOrderSchema = z
  .object({
    customerId: z.string().min(1, 'يجب اختيار العميل'),
    productName: z.string().min(1, 'يجب اختيار المنتج التصديري'),
    packagingSpec: z.string().min(1, 'مواصفة التعبئة مطلوبة'),
    orderedQtyKg: cleanPositiveNumber('الكمية المطلوبة يجب أن تكون أكبر من 0'),
    unitPriceEur: cleanPositiveNumber('سعر البيع للوحدة (ج.م) مطلوب'),
    fxRate: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? 1.0 : v),
      z.coerce.number().positive('سعر الصرف مطلوب').default(1.0)
    ),
    targetShipDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    // Derived fields (optional in input, automatically computed in output)
    totalPriceEur: cleanOptionalNumber(),
    totalPriceEgp: cleanOptionalNumber(),
  })
  .transform((data) => {
    const totalPriceEgp = Math.round(data.orderedQtyKg * data.unitPriceEur * 100) / 100;

    return {
      ...data,
      totalPriceEur: data.totalPriceEur ?? totalPriceEgp,
      totalPriceEgp: data.totalPriceEgp ?? totalPriceEgp,
    };
  });

export type ClientOrderFormValues = z.infer<typeof ClientOrderSchema>;
export type ClientOrderInput = z.input<typeof ClientOrderSchema>;
export type ClientOrderOutput = z.output<typeof ClientOrderSchema>;
