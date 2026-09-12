import { z } from 'zod';
import { cleanPositiveNumber, cleanNonNegativeNumber } from './common';

export const CustomerSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional().or(z.literal('')),
  name: z.string().min(3, 'اسم شركة العميل مطلوب'),
  country: z.string().min(2, 'الدولة مطلوبة'),
  currency: z.string().default('EGP'),
  paymentTerms: z.string().optional().nullable(),
  creditLimit: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : val),
      z.coerce.number().min(0, 'الحد الائتماني يجب ألا يكون سالباً').optional()
    )
    .optional(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')).nullable(),
});

export const AgreementSchema = z
  .object({
    productId: z.string().min(1, 'يجب اختيار المنتج'),
    targetPriceEur: cleanPositiveNumber('السعر التعاقدي مطلوب ويجب أن يكون أكبر من 0'),
    currency: z.string().optional().default('EGP'),
    packagingSpec: z.string().min(3, 'مواصفة التعبئة مطلوبة (مثل: كرتونة 10 كجم)'),
    validFrom: z.string().optional().nullable(),
    validTo: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return new Date(data.validTo) >= new Date(data.validFrom);
      }
      return true;
    },
    {
      message: 'تاريخ نهاية الاتفاقية يجب أن يكون لاحقاً أو مساوياً لتاريخ البداية',
      path: ['validTo'],
    }
  );

export type CustomerFormValues = z.infer<typeof CustomerSchema>;
export type AgreementFormValues = z.infer<typeof AgreementSchema>;
