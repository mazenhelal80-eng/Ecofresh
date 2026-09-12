import { z } from 'zod';

export const EmployeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'اسم الموظف مطلوب (3 أحرف على الأقل)'),
  nationalId: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().nullable().or(z.literal('')),
  position: z.string().min(2, 'المسمى الوظيفي مطلوب'),
  department: z.string().min(2, 'القسم مطلوب'),
  stationId: z.string().optional().nullable(),
  joiningDate: z.string().optional(),
  employmentType: z.string().default('دوام كامل'),
  basicSalary: z.coerce.number().min(0, 'الراتب الأساسي لا يمكن أن يكون سالباً').default(0),
  allowances: z.coerce.number().min(0, 'البدلات لا يمكن أن تكون سالبة').default(0),
  status: z.string().default('نشط'),
});

export type EmployeeInput = z.infer<typeof EmployeeSchema>;

export const EmployeeTransactionSchema = z.object({
  employeeId: z.string().min(1, 'معرف الموظف مطلوب'),
  date: z.string().optional(),
  type: z.string().min(1, 'نوع الحركة مطلوب'),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من 0'),
  treasuryAccountId: z.string().optional().nullable(),
  refDoc: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type EmployeeTransactionInput = z.infer<typeof EmployeeTransactionSchema>;

// Specialized Schemas for Granular Operations
export const EmployeeAdvanceSchema = z.object({
  employeeId: z.string().min(1, 'معرف الموظف مطلوب'),
  date: z.string().optional(),
  amount: z.coerce.number().positive('مبلغ السلفة يجب أن يكون أكبر من 0'),
  installmentsCount: z.coerce.number().int().min(1, 'عدد الأقساط يجب أن يكون شهراً واحداً على الأقل').default(1),
  installmentAmount: z.coerce.number().min(0).optional(),
  treasuryAccountId: z.string().min(1, 'يجب تحديد الخزينة أو الحساب البنكي لصرف السلفة'),
  notes: z.string().optional().nullable(),
});

export type EmployeeAdvanceInput = z.infer<typeof EmployeeAdvanceSchema>;

export const AdvanceRepaymentSchema = z.object({
  employeeId: z.string().min(1, 'معرف الموظف مطلوب'),
  date: z.string().optional(),
  amount: z.coerce.number().positive('مبلغ السداد يجب أن يكون أكبر من 0'),
  treasuryAccountId: z.string().min(1, 'يجب تحديد الخزينة أو الحساب البنكي المودع به السداد'),
  refDoc: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type AdvanceRepaymentInput = z.infer<typeof AdvanceRepaymentSchema>;

export const EmployeeDeductionSchema = z.object({
  employeeId: z.string().min(1, 'معرف الموظف مطلوب'),
  date: z.string().optional(),
  amount: z.coerce.number().positive('مبلغ الخصم يجب أن يكون أكبر من 0'),
  reason: z.string().min(3, 'سبب الخصم الإداري أو الجزاء مطلوب بالتفصيل'),
  refDoc: z.string().optional().nullable(),
});

export type EmployeeDeductionInput = z.infer<typeof EmployeeDeductionSchema>;

export const EmployeeBonusSchema = z.object({
  employeeId: z.string().min(1, 'معرف الموظف مطلوب'),
  date: z.string().optional(),
  type: z.string().default('مكافأة'),
  amount: z.coerce.number().positive('مبلغ المكافأة يجب أن يكون أكبر من 0'),
  treasuryAccountId: z.string().optional().nullable(),
  notes: z.string().min(3, 'سبب أو تفاصيل المكافأة مطلوب'),
});

export type EmployeeBonusInput = z.infer<typeof EmployeeBonusSchema>;

export const PayrollProcessSchema = z.object({
  employeeId: z.string().min(1, 'معرف الموظف مطلوب'),
  month: z.string().min(1, 'الشهر المالي مطلوب'), // e.g., "2026-09"
  basicSalary: z.coerce.number().min(0),
  allowances: z.coerce.number().min(0),
  bonusAmount: z.coerce.number().min(0).default(0),
  deductionAmount: z.coerce.number().min(0).default(0),
  advanceDeduction: z.coerce.number().min(0).default(0),
  netAmount: z.coerce.number().positive('صافي الراتب المستحق للصرف يجب أن يكون أكبر من 0'),
  treasuryAccountId: z.string().min(1, 'يجب تحديد الخزينة أو الحساب البنكي لصرف الراتب'),
  notes: z.string().optional().nullable(),
});

export type PayrollProcessInput = z.infer<typeof PayrollProcessSchema>;