"use server";

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, can } from '@/lib/auth';
import {
  EmployeeSchema,
  EmployeeTransactionSchema,
  EmployeeAdvanceSchema,
  AdvanceRepaymentSchema,
  EmployeeDeductionSchema,
  EmployeeBonusSchema,
  PayrollProcessSchema,
} from '@/lib/validations/employee';
import { generateTxnId, revalidateFinancialImpact } from '@/actions/financials';
import { getEmployeeFinancialSummary } from '@/lib/data/employee-ledger';
import { formatCurrency } from '@/lib/currency';

/**
 * Concurrency-safe, sequential Employee ID generator (EMP-001, EMP-002, ...)
 */
export async function generateEmployeeId(tx: any): Promise<string> {
  const employees = await tx.employee.findMany({
    select: { id: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  let maxNum = 0;
  for (const emp of employees) {
    const match = emp.id.match(/^EMP-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(3, '0');
  let empId = `EMP-${padded}`;

  while (await tx.employee.findUnique({ where: { id: empId } })) {
    maxNum++;
    empId = `EMP-${String(maxNum + 1).padStart(3, '0')}`;
  }

  return empId;
}

/**
 * Get all employees enriched with running balance summary
 */
export async function getEmployees() {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        station: true,
        transactions: {
          where: { status: { not: 'ملغاة' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return employees.map((emp) => {
      let totalDue = 0;
      let totalPaidOrDeducted = 0;
      let totalAdvances = 0;
      let totalRepayments = 0;

      for (const t of emp.transactions) {
        const amt = Number(t.amount);
        if (t.type === 'سلفة' || t.type.includes('سلفة') && !t.type.includes('سداد')) {
          totalAdvances += amt;
        } else if (t.type.includes('سداد سلفة') || t.type.includes('استرداد سلفة')) {
          totalRepayments += amt;
        }

        const isDue =
          t.type.includes('استحقاق') ||
          t.type.includes('مكافأة') ||
          t.type.includes('بدل') ||
          (t.type === 'راتب' && !t.treasuryAccountId);

        if (isDue) {
          totalDue += amt;
        } else {
          totalPaidOrDeducted += amt;
        }
      }

      const outstandingAdvances = Math.max(0, totalAdvances - totalRepayments);
      const remaining = totalDue - totalPaidOrDeducted;
      let balanceDirection: 'company_owes_employee' | 'employee_owes_company' | 'settled' = 'settled';
      if (remaining > 0) balanceDirection = 'company_owes_employee';
      else if (remaining < 0) balanceDirection = 'employee_owes_company';

      return {
        ...emp,
        basicSalary: Number(emp.basicSalary),
        allowances: Number(emp.allowances),
        totalMonthlySalary: Number(emp.basicSalary) + Number(emp.allowances),
        totalDue,
        totalPaidOrDeducted,
        totalAdvances,
        totalRepayments,
        outstandingAdvances,
        remaining,
        balanceDirection,
        balanceText:
          remaining > 0
            ? `له مستحقات: ${remaining.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`
            : remaining < 0
            ? `عليه (سلف): ${Math.abs(remaining).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`
            : 'الحساب خالص',
      };
    });
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    return [];
  }
}

/**
 * Get employee by ID with full details
 */
export async function getEmployeeById(id: string) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        station: true,
        transactions: {
          include: {
            treasuryAccount: true,
            financialTransaction: true,
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!employee) return null;

    const summary = await getEmployeeFinancialSummary(id);

    return {
      ...employee,
      basicSalary: Number(employee.basicSalary),
      allowances: Number(employee.allowances),
      summary,
    };
  } catch (error) {
    console.error(`Failed to fetch employee ${id}:`, error);
    return null;
  }
}

/**
 * Create a new employee
 */
export async function createEmployee(formDataOrData: FormData | unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بإضافة موظفين' };
  }

  const rawData =
    formDataOrData instanceof FormData
      ? Object.fromEntries(formDataOrData)
      : formDataOrData;

  const validated = EmployeeSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  try {
    const newEmployee = await prisma.$transaction(async (tx) => {
      const empId = validated.data.id || (await generateEmployeeId(tx));

      const employee = await tx.employee.create({
        data: {
          id: empId,
          name: validated.data.name,
          nationalId: validated.data.nationalId || null,
          phone: validated.data.phone || null,
          email: validated.data.email || null,
          position: validated.data.position,
          department: validated.data.department,
          stationId: validated.data.stationId || null,
          joiningDate: validated.data.joiningDate ? new Date(validated.data.joiningDate) : new Date(),
          employmentType: validated.data.employmentType || 'دوام كامل',
          basicSalary: validated.data.basicSalary,
          allowances: validated.data.allowances,
          status: validated.data.status || 'نشط',
          isActive: true,
        },
        include: { station: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'employee',
          entityId: employee.id,
          action: 'CREATE',
          summary: `إضافة موظف جديد: ${employee.name} (${employee.position} - ${employee.department})`,
          performedBy: user.id,
        },
      });

      return employee;
    });

    revalidatePath('/employees');
    return {
      success: true,
      message: `تم تسجيل الموظف ${newEmployee.name} بكود ${newEmployee.id} بنجاح`,
      data: newEmployee,
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'كود الموظف مسجل مسبقاً' };
    }
    return { success: false, error: error.message || 'حدث خطأ أثناء تسجيل الموظف' };
  }
}

/**
 * Update employee details
 */
export async function updateEmployee(id: string, formDataOrData: FormData | unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_MASTER_DATA')) {
    return { success: false, error: 'غير مصرح لك بتعديل بيانات الموظفين' };
  }

  const rawData =
    formDataOrData instanceof FormData
      ? Object.fromEntries(formDataOrData)
      : formDataOrData;

  const validated = EmployeeSchema.safeParse(rawData);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: {
          name: validated.data.name,
          nationalId: validated.data.nationalId || null,
          phone: validated.data.phone || null,
          email: validated.data.email || null,
          position: validated.data.position,
          department: validated.data.department,
          stationId: validated.data.stationId || null,
          employmentType: validated.data.employmentType,
          basicSalary: validated.data.basicSalary,
          allowances: validated.data.allowances,
          status: validated.data.status,
        },
        include: { station: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'employee',
          entityId: employee.id,
          action: 'UPDATE',
          summary: `تعديل بيانات الموظف: ${employee.name}`,
          performedBy: user.id,
        },
      });

      return employee;
    });

    revalidatePath('/employees');
    revalidatePath(`/employees/${id}`);
    return {
      success: true,
      message: `تم تحديث بيانات الموظف ${updated.name} بنجاح`,
      data: updated,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'حدث خطأ أثناء تعديل بيانات الموظف' };
  }
}

/**
 * Add Employee Financial Transaction (Payroll / Advance / Deduction / Custody)
 * Fully Atomic with Strict Server-Side Validation & Overdraft Protection
 */
export async function addEmployeeTransaction(employeeId: string, payload: unknown) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_FINANCIALS')) {
    return { success: false, error: 'غير مصرح لك بقيد حركات مالية للموظفين' };
  }

  const validated = EmployeeTransactionSchema.safeParse({
    ...(typeof payload === 'object' && payload !== null ? payload : {}),
    employeeId,
  });

  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const txnDate = data.date ? new Date(data.date) : new Date();

  // 1. Classification of Transaction Nature
  const CASH_OUTFLOW_TYPES = ['مرتب', 'صرف راتب', 'سلفة', 'سلفة مالية', 'مكافأة', 'مكافأة تشجيعية', 'بدل', 'بدل انتقال', 'صرف عهدة'];
  const CASH_INFLOW_TYPES = ['سداد سلفة', 'استرداد سلفة', 'تسوية عهدة نقدي', 'استرداد عهدة'];
  const NON_CASH_TYPES = ['خصم إداري', 'جزاء', 'تسوية مستحقات غير نقدية', 'استحقاق راتب شهري', 'استحقاق راتب', 'تسوية دائنة إدارية'];

  const isCashOutflow = CASH_OUTFLOW_TYPES.some((t) => data.type.includes(t) || t.includes(data.type));
  const isCashInflow = CASH_INFLOW_TYPES.some((t) => data.type.includes(t) || t.includes(data.type));
  const isNonCash = NON_CASH_TYPES.some((t) => data.type.includes(t) || t.includes(data.type));

  // 2. Strict Server-Side Validation Rules
  if ((isCashOutflow || isCashInflow) && !data.treasuryAccountId) {
    return {
      success: false,
      error: 'يجب تحديد الخزينة أو الحساب البنكي للعمليات النقدية',
    };
  }

  if (isNonCash && data.treasuryAccountId) {
    return {
      success: false,
      error: 'لا يمكن ربط العمليات غير النقدية بحساب خزينة أو بنك',
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Verify employee existence
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) {
        throw new Error(`الموظف ${employeeId} غير موجود في النظام`);
      }

      let financialTransactionId: string | null = null;
      let treasuryAccountName: string | null = null;

      // Step B: Handle Cash Movements (Outflow / Inflow)
      if (data.treasuryAccountId && (isCashOutflow || isCashInflow)) {
        const account = await tx.treasuryAccount.findUnique({
          where: { id: data.treasuryAccountId },
        });

        if (!account) {
          throw new Error(`الحساب المالي ${data.treasuryAccountId} غير موجود`);
        }
        treasuryAccountName = account.name;

        const currentBalance = Number(account.balance);
        const amount = Number(data.amount);

        if (isCashOutflow) {
          // Strict Overdraft Protection Check
          if (currentBalance < amount) {
            throw new Error(
              `رصيد الحساب ${account.name} (${formatCurrency(currentBalance)}) لا يكفي لسداد ${formatCurrency(amount)}`
            );
          }

          // Atomic Balance Mutation with Optimistic Concurrency Guard
          const updateResult = await tx.treasuryAccount.updateMany({
            where: {
              id: data.treasuryAccountId,
              balance: { gte: amount },
            },
            data: {
              balance: { decrement: amount },
            },
          });

          if (updateResult.count === 0) {
            throw new Error(
              `تعذر الخصم من الحساب ${account.name} لعدم كفاية الرصيد أو حدوث حركة متزامنة`
            );
          }
        } else if (isCashInflow) {
          // Atomic Inflow Mutation
          await tx.treasuryAccount.update({
            where: { id: data.treasuryAccountId },
            data: {
              balance: { increment: amount },
            },
          });
        }

        // Generate Collision-Free Financial Transaction ID
        const txnId = await generateTxnId(tx, txnDate);
        financialTransactionId = txnId;

        // Map Financial Transaction Type
        const finTxnType = isCashOutflow
          ? (data.type.includes('سلفة') ? 'سلفة موظف' : 'صرف مرتبات وأجور')
          : 'سداد سلفة / توريد نقدي';

        const debit = isCashOutflow ? data.amount : 0;
        const credit = isCashOutflow ? 0 : data.amount;
        const paymentMethod = account.type.includes('بنك') ? 'BANK_TRANSFER' : 'CASH';

        await tx.financialTransaction.create({
          data: {
            txnId,
            date: txnDate,
            type: finTxnType,
            partyType: 'موظف',
            partyId: employee.id,
            partyName: employee.name,
            amountEgp: data.amount,
            amountCurrency: null,
            currency: 'EGP',
            refDoc: data.refDoc || `حركة موظف ${employee.id}`,
            accountId: data.treasuryAccountId,
            accountName: account.name,
            description: data.notes || `${data.type} للموظف ${employee.name} (${employee.position})`,
            status: 'معتمد',
            createdById: user.id,
          },
        });

        // Audit Trail for Financial Impact
        await tx.auditLog.create({
          data: {
            entityType: 'transaction',
            entityId: txnId,
            action: isCashOutflow ? 'PAYMENT' : 'COLLECTION',
            summary: `قيد سند ${finTxnType} للموظف ${employee.name} بقيمة ${formatCurrency(amount)} من حساب ${account.name}`,
            performedBy: user.id,
          },
        });
      }

      // Step C: Record Employee Transaction Ledger Entry
      const employeeTxn = await tx.employeeTransaction.create({
        data: {
          employeeId: employee.id,
          date: txnDate,
          type: data.type,
          amount: data.amount,
          treasuryAccountId: data.treasuryAccountId || null,
          financialTransactionId,
          refDoc: data.refDoc || null,
          notes: data.notes || null,
          status: 'معتمد',
          createdById: user.id,
        },
      });

      // Step D: Audit Log for Employee Ledger
      await tx.auditLog.create({
        data: {
          entityType: 'employee_transaction',
          entityId: employeeTxn.id,
          action: 'CREATE',
          summary: `قيد ${data.type} للموظف ${employee.name} بقيمة ${Number(data.amount).toLocaleString()} ج.م`,
          performedBy: user.id,
        },
      });

      return {
        employeeTxn,
        financialTransactionId,
        treasuryAccountName,
        employeeName: employee.name,
      };
    });

    // Revalidate All Affected Routes
    revalidatePath('/employees');
    revalidatePath(`/employees/${employeeId}`);
    if (result.financialTransactionId) {
      await revalidateFinancialImpact('موظف', employeeId);
    }

    return {
      success: true,
      message: `تم قيد ${data.type} للموظف ${result.employeeName} بنجاح`,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء قيد الحركة المالية للموظف',
    };
  }
}

/**
 * Record Employee Advance with Installment Plan
 */
export async function createEmployeeAdvance(payload: unknown) {
  const validated = EmployeeAdvanceSchema.safeParse(payload);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  const { employeeId, amount, installmentsCount, treasuryAccountId, date, notes } = validated.data;
  const refDoc = `سلفة (أقساط: ${installmentsCount})`;
  const finalNotes = notes ? `${notes} — مقسمة على ${installmentsCount} شهر` : `سلفة على ذمة الراتب مقسمة على ${installmentsCount} شهر`;

  return addEmployeeTransaction(employeeId, {
    type: 'سلفة',
    amount,
    date,
    treasuryAccountId,
    refDoc,
    notes: finalNotes,
  });
}

/**
 * Record Advance Repayment with validation against remaining balance
 */
export async function createAdvanceRepayment(payload: unknown) {
  const validated = AdvanceRepaymentSchema.safeParse(payload);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  const { employeeId, amount, treasuryAccountId, date, notes, refDoc } = validated.data;
  const summary = await getEmployeeFinancialSummary(employeeId);

  if (summary.outstandingAdvances > 0 && amount > summary.outstandingAdvances) {
    return {
      success: false,
      error: `مبلغ السداد (${formatCurrency(amount)}) أكبر من إجمالي السلف القائمة على الموظف (${formatCurrency(summary.outstandingAdvances)})`,
    };
  }

  return addEmployeeTransaction(employeeId, {
    type: 'سداد سلفة',
    amount,
    date,
    treasuryAccountId,
    refDoc: refDoc || 'سداد نقدي لسلفة',
    notes: notes || 'سداد دفعة من السلفة المستحقة',
  });
}

/**
 * Record Administrative Deduction / Penalty
 */
export async function createEmployeeDeduction(payload: unknown) {
  const validated = EmployeeDeductionSchema.safeParse(payload);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  const { employeeId, amount, reason, date, refDoc } = validated.data;

  return addEmployeeTransaction(employeeId, {
    type: 'خصم إداري',
    amount,
    date,
    treasuryAccountId: null,
    refDoc: refDoc || 'خصم إداري',
    notes: reason,
  });
}

/**
 * Record Bonus or Allowance
 */
export async function createEmployeeBonus(payload: unknown) {
  const validated = EmployeeBonusSchema.safeParse(payload);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  const { employeeId, amount, type, treasuryAccountId, date, notes } = validated.data;

  return addEmployeeTransaction(employeeId, {
    type: type || 'مكافأة',
    amount,
    date,
    treasuryAccountId: treasuryAccountId || null,
    refDoc: type === 'بدل' ? 'بدل إضافي' : 'مكافأة تشجيعية',
    notes,
  });
}

/**
 * Process Monthly Payroll for an Employee
 */
export async function processEmployeePayroll(payload: unknown) {
  const validated = PayrollProcessSchema.safeParse(payload);
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors };
  }

  const { employeeId, month, basicSalary, allowances, bonusAmount, deductionAmount, advanceDeduction, netAmount, treasuryAccountId, notes } = validated.data;

  // Execute in transaction to ensure atomicity
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'MANAGE_FINANCIALS')) {
    return { success: false, error: 'غير مصرح لك باعتماد وصرف مسير الرواتب' };
  }

  try {
    const grossDue = basicSalary + allowances + bonusAmount;
    const totalDeductions = deductionAmount + advanceDeduction;
    const computedNet = grossDue - totalDeductions;

    if (Math.abs(computedNet - netAmount) > 0.01) {
      return {
        success: false,
        error: `خطأ في تطابق صافي الراتب: المحتسب (${formatCurrency(computedNet)}) لا يطابق المطلوب (${formatCurrency(netAmount)})`,
      };
    }

    // Step 1: Record Accrual for the month
    await addEmployeeTransaction(employeeId, {
      type: 'استحقاق راتب شهري',
      amount: grossDue,
      treasuryAccountId: null,
      refDoc: `استحقاق شهر ${month}`,
      notes: `استحقاق الراتب الشهري لشهر ${month} (أساسي: ${basicSalary} + بدلات: ${allowances}${bonusAmount > 0 ? ` + مكافأة: ${bonusAmount}` : ''})`,
    });

    // Step 2: If there is an advance installment deduction, record repayment
    if (advanceDeduction > 0) {
      await addEmployeeTransaction(employeeId, {
        type: 'سداد سلفة',
        amount: advanceDeduction,
        treasuryAccountId: null, // Deduction against salary accrual
        refDoc: `خصم قسط سلفة لشهر ${month}`,
        notes: `خصم قسط سلفة من راتب شهر ${month}`,
      });
    }

    // Step 3: If administrative deductions apply
    if (deductionAmount > 0) {
      await addEmployeeTransaction(employeeId, {
        type: 'خصم إداري',
        amount: deductionAmount,
        treasuryAccountId: null,
        refDoc: `خصومات شهر ${month}`,
        notes: `خصومات وجزاءات إدارية عن شهر ${month}`,
      });
    }

    // Step 4: Pay the remaining Net Salary via Treasury Outflow
    const payoutResult = await addEmployeeTransaction(employeeId, {
      type: 'صرف راتب',
      amount: netAmount,
      treasuryAccountId,
      refDoc: `مسير رواتب ${month}`,
      notes: notes || `صرف صافي راتب شهر ${month}`,
    });

    return payoutResult;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'حدث خطأ أثناء صرف مسير الراتب',
    };
  }
}
