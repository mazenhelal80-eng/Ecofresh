export interface EmployeeProfile {
  id: string;
  name: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  position: string;
  department: string;
  stationId: string | null;
  stationName?: string | null;
  joiningDate: string | Date;
  employmentType: string;
  basicSalary: number;
  allowances: number;
  totalMonthlySalary: number;
  status: string;
  isActive: boolean;
}

export interface EmployeeStatementRow {
  id: string;
  date: Date;
  type: string;
  amount: number;
  dueAmount: number;
  paidAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  balance: number;
  treasuryAccountId: string | null;
  treasuryAccountName: string | null;
  financialTransactionId: string | null;
  refDoc: string | null;
  notes: string | null;
  status: string;
  isCancelled: boolean;
}

export interface EmployeeAdvanceRecord {
  id: string;
  date: Date;
  refDoc: string | null;
  totalAmount: number;
  installmentCount: number;
  monthlyInstallment: number;
  repaidAmount: number;
  remainingAmount: number;
  status: 'active' | 'settled';
  notes: string | null;
}

export interface EmployeePayrollSlip {
  month: string;
  basicSalary: number;
  allowances: number;
  bonuses: number;
  grossSalary: number;
  deductions: number;
  advanceInstallment: number;
  totalDeductions: number;
  netPayable: number;
  isPaid: boolean;
  paidDate?: Date | null;
  payoutTxnId?: string | null;
  treasuryAccountName?: string | null;
}

export interface EmployeeFinancialSummary {
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  stationName: string | null;
  // 1. التعاقد
  basicSalary: number;
  allowances: number;
  totalMonthlySalary: number;
  // 2. محفظة السلف
  totalAdvances: number;
  totalRepayments: number;
  outstandingAdvances: number;
  nextMonthInstallment: number;
  // 3. مسير الشهر الحالي
  currentMonthGross: number;
  currentMonthBonuses: number;
  currentMonthDeductions: number;
  currentMonthNetPayable: number;
  currentMonthStatus: 'PAID' | 'PENDING_PAYOUT';
  // 4. الحساب الإجمالي
  totalDue: number;
  totalPaidOrDeducted: number;
  remainingDue: number;
  statusBadge: string;
  statusText: string;
  // 5. آخر حركة
  lastMovementDate: Date | null;
  lastMovementType: string | null;
  lastMovementAmount: number | null;
  lastMovementRelative: string | null;
}

export interface EmployeePayrollPreview {
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  grossSalary: number;
  pendingBonuses: number;
  pendingDeductions: number;
  advanceInstallment: number;
  outstandingAdvanceTotal: number;
  netSalary: number;
}
