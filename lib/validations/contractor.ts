import { z } from 'zod';
import { cleanPositiveNumber } from './common';

export const ContractorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'اسم المقاول مطلوب'),
  tariffRatePerKg: cleanPositiveNumber('تعريفة الكيلو يجب أن تكون أكبر من 0').default(2.0),
  phone: z.string().optional(),
  specialization: z.string().optional(),
});

export type ContractorInput = z.infer<typeof ContractorSchema>;
