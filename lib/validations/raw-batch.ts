import { z } from 'zod';
import {
  cleanPositiveNumber,
  cleanNonNegativeNumber,
  cleanOptionalPositiveNumber,
  cleanOptionalNumber,
} from './common';

export const RawBatchSchema = z
  .object({
    stationId: z.string().min(1, 'يجب اختيار المحطة المستلمة'),
    supplierId: z.string().min(1, 'يجب اختيار المورد أو المزرعة'),
    rawProduct: z.string().min(2, 'اسم الخام الزراعي مطلوب (مثل: فراولة خام)'),
    grossQtyKg: cleanPositiveNumber('الوزن القائم يجب أن يكون أكبر من 0'),
    tareQtyKg: cleanNonNegativeNumber('وزن السيارات الفارغة لا يمكن أن يكون سالباً', 0),
    unitPriceEgp: cleanPositiveNumber('سعر شراء الكيلو يجب أن يكون أكبر من 0'),
    transportCostEgp: cleanNonNegativeNumber('النولون لا يمكن أن يكون سالباً', 0),
    receivedDate: z.string().optional().nullable(),
    brixDegree: z.preprocess(
      (v) => (v === '' ? null : v),
      z.coerce.number().min(0).max(100).optional().nullable()
    ),
    truckPlate: z.string().optional().nullable(),
    driverName: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    submissionId: z.string().optional().nullable(),
    // Derived fields (optional in input, automatically computed in output)
    netQtyKg: cleanOptionalPositiveNumber(),
    totalPayableEgp: cleanOptionalNumber(),
    unitCost: cleanOptionalNumber(),
  })
  .refine((data) => data.grossQtyKg > (data.tareQtyKg || 0), {
    message: 'الوزن القائم يجب أن يكون أكبر من وزن السيارات الفارغة (الفارغ)',
    path: ['grossQtyKg'],
  })
  .transform((data) => {
    const netQtyKg = Number((data.grossQtyKg - (data.tareQtyKg || 0)).toFixed(4));
    const totalPayableEgp =
      Number((netQtyKg * data.unitPriceEgp + (data.transportCostEgp || 0)).toFixed(4));
    const unitCost = netQtyKg > 0 ? Number((totalPayableEgp / netQtyKg).toFixed(4)) : 0;

    return {
      ...data,
      netQtyKg: data.netQtyKg ?? netQtyKg,
      totalPayableEgp: data.totalPayableEgp ?? totalPayableEgp,
      unitCost: data.unitCost ?? unitCost,
    };
  });

export const RawArrivalSchema = RawBatchSchema;

export type RawBatchFormValues = z.infer<typeof RawBatchSchema>;
export type RawBatchInput = z.input<typeof RawBatchSchema>;
export type RawBatchOutput = z.output<typeof RawBatchSchema>;

export type RawArrivalFormValues = RawBatchFormValues;
export type RawArrivalInput = RawBatchInput;
export type RawArrivalOutput = RawBatchOutput;
