import { prisma } from '@/lib/prisma';
import { formatArabicRelativeDate } from '@/lib/data/ledger';
import {
  EmployeeFinancialSummary,
  EmployeeStatementRow,
  EmployeeAdvanceRecord,
  EmployeePayrollSlip,
  EmployeePayrollPreview,
} from '@/types/employee';

export async function getEmployeeFinancialSummary(employeeId: string): Promise<EmployeeFinancialSummary> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        station: true,
        transactions: {
          orderBy: [
            { date: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });

    if (!employee) {
      throw new Error(`الموظف ${employeeId} غير موجود`);
    }

    const basicSalary = Number(employee.basicSalary);
    const allowances = Number(employee.allowances);
    const totalMonthlySalary = basicSalary + allowances;

    let totalDue = 0;
    let totalPaidOrDeducted = 0;
    let totalAdvances = 0;
    let totalRepayments = 0;
    let totalDeductions = 0;
    let totalBonuses = 0;

    const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    let currentMonthHasPaidSalary = false;
    let currentMonthBonuses = 0;
    let currentMonthDeductions = 0;

    for (const t of employee.transactions) {
      if (t.status === 'ملغاة') continue;
      const amt = Number(t.amount);
      const tMonthKey = t.date.toISOString().slice(0, 7);

      // Advances tracking
      if (t.type === 'سلفة' || (t.type.includes('سلفة') && !t.type.includes('سداد'))) {
        totalAdvances += amt;
      } else if (t.type.includes('سداد سلفة') || t.type.includes('استرداد سلفة')) {
        totalRepayments += amt;
      }

      // Deductions
      if (t.type.includes('خصم') || t.type.includes('جزاء')) {
        totalDeductions += amt;
        if (tMonthKey === currentMonthKey) currentMonthDeductions += amt;
      }

      // Bonuses
      if (t.type.includes('مكافأة') || t.type.includes('بدل')) {
        totalBonuses += amt;
        if (tMonthKey === currentMonthKey) currentMonthBonuses += amt;
      }

      // Salary Payout Detection for current month
      if (t.type === 'صرف راتب' && (tMonthKey === currentMonthKey || (t.refDoc && t.refDoc.includes(currentMonthKey)))) {
        currentMonthHasPaidSalary = true;
      }

      // General Accounting Ledger
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
    const nextMonthInstallment = outstandingAdvances > 0 ? Math.min(outstandingAdvances, Math.round(totalMonthlySalary * 0.3)) : 0;

    const currentMonthGross = totalMonthlySalary + currentMonthBonuses;
    const currentMonthNetPayable = Math.max(0, currentMonthGross - currentMonthDeductions - nextMonthInstallment);
    const currentMonthStatus: 'PAID' | 'PENDING_PAYOUT' = currentMonthHasPaidSalary ? 'PAID' : 'PENDING_PAYOUT';

    const remainingDue = totalDue - totalPaidOrDeducted;
    let statusBadge = 'مسدد بالكامل';
    let statusText = 'لا توجد مستحقات معلقة';

    if (currentMonthStatus === 'PENDING_PAYOUT') {
      statusBadge = 'بانتظار صرف الراتب';
      statusText = `صافي مسير الشهر: ${currentMonthNetPayable.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`;
    } else if (outstandingAdvances > 0) {
      statusBadge = 'سلف قائمة';
      statusText = `متبقي سلف: ${outstandingAdvances.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م`;
    }

    const lastTxn = employee.transactions[0];

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      position: employee.position,
      department: employee.department,
      stationName: employee.station?.name || null,
      basicSalary,
      allowances,
      totalMonthlySalary,
      totalAdvances,
      totalRepayments,
      outstandingAdvances,
      nextMonthInstallment,
      currentMonthGross,
      currentMonthBonuses,
      currentMonthDeductions,
      currentMonthNetPayable,
      currentMonthStatus,
      totalDue,
      totalPaidOrDeducted,
      remainingDue,
      statusBadge,
      statusText,
      lastMovementDate: lastTxn ? lastTxn.date : null,
      lastMovementType: lastTxn ? lastTxn.type : null,
      lastMovementAmount: lastTxn ? Number(lastTxn.amount) : null,
      lastMovementRelative: lastTxn ? formatArabicRelativeDate(lastTxn.date) : null,
    };
  } catch (error) {
    console.error(`Failed to calculate employee summary for ${employeeId}:`, error);
    return {
      employeeId,
      employeeName: employeeId,
      position: '',
      department: '',
      stationName: null,
      basicSalary: 0,
      allowances: 0,
      totalMonthlySalary: 0,
      totalAdvances: 0,
      totalRepayments: 0,
      outstandingAdvances: 0,
      nextMonthInstallment: 0,
      currentMonthGross: 0,
      currentMonthBonuses: 0,
      currentMonthDeductions: 0,
      currentMonthNetPayable: 0,
      currentMonthStatus: 'PAID',
      totalDue: 0,
      totalPaidOrDeducted: 0,
      remainingDue: 0,
      statusBadge: 'الحساب خالص',
      statusText: 'لا توجد بيانات',
      lastMovementDate: null,
      lastMovementType: null,
      lastMovementAmount: null,
      lastMovementRelative: null,
    };
  }
}

export async function getEmployeeLedger(employeeId: string): Promise<{
  summary: EmployeeFinancialSummary;
  rows: EmployeeStatementRow[];
  advances: EmployeeAdvanceRecord[];
  payrollHistory: EmployeePayrollSlip[];
}> {
  const summary = await getEmployeeFinancialSummary(employeeId);

  const transactions = await prisma.employeeTransaction.findMany({
    where: { employeeId },
    include: {
      treasuryAccount: true,
      financialTransaction: true,
    },
    orderBy: [
      { date: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  let currentRunning = 0;

  const rows: EmployeeStatementRow[] = transactions.map((t) => {
    const isCancelled = t.status === 'ملغاة';
    const amount = Number(t.amount);

    const isDue =
      t.type.includes('استحقاق') ||
      t.type.includes('مكافأة') ||
      t.type.includes('بدل') ||
      (t.type === 'راتب' && !t.treasuryAccountId);

    let dueAmount = 0;
    let paidAmount = 0;

    if (isDue) {
      dueAmount = amount;
    } else {
      paidAmount = amount;
    }

    const balanceBefore = currentRunning;
    if (!isCancelled) {
      if (dueAmount > 0) currentRunning += dueAmount;
      if (paidAmount > 0) currentRunning -= paidAmount;
    }
    const balanceAfter = currentRunning;

    return {
      id: t.id,
      date: t.date,
      type: t.type,
      amount,
      dueAmount,
      paidAmount,
      balanceBefore,
      balanceAfter,
      balance: balanceAfter,
      treasuryAccountId: t.treasuryAccountId,
      treasuryAccountName: t.treasuryAccount?.name || null,
      financialTransactionId: t.financialTransactionId,
      refDoc: t.refDoc,
      notes: t.notes,
      status: t.status,
      isCancelled,
    };
  });

  // Extract and calculate advances
  const advancesList: EmployeeAdvanceRecord[] = [];
  const advanceTxns = transactions.filter(
    (t) => (t.type === 'سلفة' || t.type.includes('سلفة')) && !t.type.includes('سداد') && t.status !== 'ملغاة'
  );

  for (const adv of advanceTxns) {
    const totalAmount = Number(adv.amount);
    let installmentCount = 1;
    if (adv.refDoc && adv.refDoc.includes('أقساط:')) {
      const match = adv.refDoc.match(/أقساط:\s*(\d+)/);
      if (match) installmentCount = parseInt(match[1], 10);
    }

    const matchedRepayments = transactions
      .filter((t) => (t.type.includes('سداد سلفة') || t.type.includes('استرداد سلفة')) && t.status !== 'ملغاة')
      .reduce((s, t) => s + Number(t.amount), 0);

    const repaidAmount = Math.min(totalAmount, matchedRepayments);
    const remainingAmount = Math.max(0, totalAmount - repaidAmount);

    advancesList.push({
      id: adv.id,
      date: adv.date,
      refDoc: adv.refDoc,
      totalAmount,
      installmentCount,
      monthlyInstallment: Math.round(totalAmount / installmentCount),
      repaidAmount,
      remainingAmount,
      status: remainingAmount <= 0 ? 'settled' : 'active',
      notes: adv.notes,
    });
  }

  // Extract Payroll History
  const payrollHistory: EmployeePayrollSlip[] = [];
  const payoutTxns = transactions.filter((t) => t.type === 'صرف راتب' && t.status !== 'ملغاة');

  for (const p of payoutTxns) {
    const month = p.refDoc?.match(/\d{4}-\d{2}/)?.[0] || p.date.toISOString().slice(0, 7);
    const netAmount = Number(p.amount);

    payrollHistory.push({
      month,
      basicSalary: summary.basicSalary,
      allowances: summary.allowances,
      bonuses: 0,
      grossSalary: summary.totalMonthlySalary,
      deductions: 0,
      advanceInstallment: 0,
      totalDeductions: 0,
      netPayable: netAmount,
      isPaid: true,
      paidDate: p.date,
      payoutTxnId: p.financialTransactionId,
      treasuryAccountName: p.treasuryAccount?.name || 'الخزينة الرئيسية',
    });
  }

  rows.reverse();
  payrollHistory.reverse();

  return {
    summary,
    rows,
    advances: advancesList,
    payrollHistory,
  };
}
