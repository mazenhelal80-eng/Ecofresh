import { z } from 'zod';

/**
 * Coerces numeric inputs cleanly.
 * Converts empty strings (""), null, or undefined to undefined to prevent premature '0' values
 * in initial clean form states, then validates positivity (> 0).
 */
export const cleanPositiveNumber = (message: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : val),
    z.coerce.number({ invalid_type_error: message, required_error: message }).positive(message)
  ) as unknown as z.ZodNumber;

/**
 * Coerces numeric inputs cleanly with a minimum constraint of 0.
 * Empty strings are converted to default value (or 0).
 */
export const cleanNonNegativeNumber = (message: string, defaultValue = 0) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? defaultValue : val),
    z.coerce.number({ invalid_type_error: message }).min(0, message).default(defaultValue)
  ) as unknown as z.ZodNumber;

/**
 * Optional positive number that converts empty strings, null, or undefined to undefined.
 */
export const cleanOptionalPositiveNumber = () =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : val),
    z.coerce.number().positive().optional()
  ) as unknown as z.ZodOptional<z.ZodNumber>;

/**
 * Optional number that converts empty strings, null, or undefined to undefined.
 */
export const cleanOptionalNumber = () =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : val),
    z.coerce.number().optional()
  ) as unknown as z.ZodOptional<z.ZodNumber>;

/**
 * Clean integer coercion for pure discrete integer counts (e.g. package counts, installments).
 */
export const cleanPositiveInt = (message: string) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined || Number.isNaN(val) ? undefined : val),
    z.coerce
      .number({ invalid_type_error: message, required_error: message })
      .int('يجب أن تكون القيمة عدداً صحيحاً')
      .positive(message)
  ) as unknown as z.ZodNumber;
