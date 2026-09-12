export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmployeeById } from "@/actions/employees";
import { getEmployeeLedger } from "@/lib/data/employee-ledger";
import { getStationsForSelect } from "@/actions/contractors";
import { getTreasuryAccounts } from "@/actions/treasury";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Award,
  Building2,
  Calculator,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Landmark,
  Mail,
  MinusCircle,
  Phone,
  Receipt,
  Scale,
  ShieldCheck,
  User,
  UserCheck,
  Wallet,
} from "lucide-react";
import { EmployeeLedgerTable } from "@/components/modules/employees/EmployeeLedgerTable";
import { AddAdvanceDialog } from "@/components/modules/employees/AddAdvanceDialog";
import { RepayAdvanceDialog } from "@/components/modules/employees/RepayAdvanceDialog";
import { AddDeductionDialog } from "@/components/modules/employees/AddDeductionDialog";
import { AddBonusDialog } from "@/components/modules/employees/AddBonusDialog";
import { ProcessPayrollDialog } from "@/components/modules/employees/ProcessPayrollDialog";
import { EmployeeForm } from "@/components/modules/employees/EmployeeForm";
import { formatCurrency } from "@/lib/currency";

export const metadata = {
  title: "تفاصيل وملف الموظف — EcoFresh ERP",
};

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EmployeeDetailsPage({ params }: PageProps) {
  const [employee, ledger, stations, accounts] = await Promise.all([
    getEmployeeById(params.id),
    getEmployeeLedger(params.id),
    getStationsForSelect(),
    getTreasuryAccounts(),
  ]);

  if (!employee) {
    notFound();
  }

  const { summary, rows, advances, payrollHistory } = ledger;
  const mappedAccounts = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    balance: Number(a.balance),
    currency: a.currency,
  }));

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link
              href="/employees"
              className="hover:text-emerald-700 transition-colors flex items-center gap-1 font-medium"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              دليل الموظفين
            </Link>
            <span>/</span>
            <span>ملف وكشوف حسابات الموظف</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <UserCheck className="h-6 w-6 text-emerald-800" />
            <span>{employee.name}</span>
            <Badge variant="outline" className="font-mono text-xs bg-gray-50">
              {employee.id}
            </Badge>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EmployeeForm
            stations={stations}
            employee={employee}
            trigger={
              <Button variant="outline" size="sm" className="font-bold">
                تعديل البيانات
              </Button>
            }
          />

          <AddAdvanceDialog
            employeeId={employee.id}
            employeeName={employee.name}
            monthlySalary={summary.totalMonthlySalary}
            treasuryAccounts={mappedAccounts}
          />

          {summary.outstandingAdvances > 0 && (
            <RepayAdvanceDialog
              employeeId={employee.id}
              employeeName={employee.name}
              outstandingAdvances={summary.outstandingAdvances}
              treasuryAccounts={mappedAccounts}
            />
          )}

          <AddDeductionDialog
            employeeId={employee.id}
            employeeName={employee.name}
          />

          <AddBonusDialog
            employeeId={employee.id}
            employeeName={employee.name}
            treasuryAccounts={mappedAccounts}
          />

          <ProcessPayrollDialog
            employeeId={employee.id}
            employeeName={employee.name}
            basicSalary={summary.basicSalary}
            allowances={summary.allowances}
            outstandingAdvances={summary.outstandingAdvances}
            treasuryAccounts={mappedAccounts}
          />
        </div>
      </div>

      {/* Logical KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Contractual Salary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 block mb-1">الراتب الشهري التعاقدي</span>
          <div className="text-xl font-bold text-gray-900 font-mono">
            {formatCurrency(summary.totalMonthlySalary)}
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            أساسي: {formatCurrency(summary.basicSalary)} + بدلات: {formatCurrency(summary.allowances)}
          </span>
        </div>

        {/* Card 2: Current Month Net Pay */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 block mb-1">صافي مسير الشهر الحالي</span>
          <div className="text-xl font-bold text-emerald-800 font-mono">
            {formatCurrency(summary.currentMonthNetPayable)}
          </div>
          <span className="text-[11px] text-emerald-600">
            {summary.currentMonthStatus === 'PAID' ? 'تم اعتماد وصرف الراتب' : 'بانتظار الصرف والتحويل'}
          </span>
        </div>

        {/* Card 3: Outstanding Advances */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <span className="text-xs font-semibold text-amber-700 block mb-1">محفظة السلف القائمة</span>
          <div className="text-xl font-bold text-amber-800 font-mono">
            {formatCurrency(summary.outstandingAdvances)}
          </div>
          <span className="text-[11px] text-amber-600">
            {summary.outstandingAdvances > 0 ? `قسط الشهر: ${formatCurrency(summary.nextMonthInstallment)}` : 'لا توجد سلف متبقية'}
          </span>
        </div>

        {/* Card 4: Account Status */}
        <div className="bg-gradient-to-br from-[#012d1d] to-[#02472e] text-white rounded-xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-200 block mb-1">حالة الحساب المالي</span>
          <div className="text-lg font-bold">
            {summary.statusBadge}
          </div>
          <span className="text-xs text-emerald-100 font-mono">
            {summary.statusText}
          </span>
        </div>
      </div>

      {/* Employee Master Details Card */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-700" />
            البيانات الوظيفية والتعاقدية
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block mb-0.5">المسمى الوظيفي</span>
            <strong className="text-gray-800">{employee.position}</strong>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">القسم الإداري</span>
            <strong className="text-gray-800">{employee.department}</strong>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">المحطة التابع لها</span>
            <strong className="text-gray-800">{employee.station?.name || "عام لكافة المحطات"}</strong>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">نوع التعاقد</span>
            <strong className="text-gray-800">{employee.employmentType}</strong>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">رقم الهاتف</span>
            <strong className="text-gray-800 font-mono">{employee.phone || "—"}</strong>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">الرقم القومي</span>
            <strong className="text-gray-800 font-mono">{employee.nationalId || "—"}</strong>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">البريد الإلكتروني</span>
            <strong className="text-gray-800">{employee.email || "—"}</strong>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">الحالة الوظيفية</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              {employee.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Logical Sections */}
      <Tabs defaultValue="ledger" className="space-y-4" dir="rtl">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="ledger" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-900">
            <FileText className="h-4 w-4" />
            سجل كشف الحساب التراكمي ({rows.length})
          </TabsTrigger>
          <TabsTrigger value="advances" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-900">
            <HandCoins className="h-4 w-4" />
            خطة السلف والأقساط ({advances.length})
          </TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-900">
            <Receipt className="h-4 w-4" />
            مسيرات الرواتب المنصرفة ({payrollHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Running Balance Ledger */}
        <TabsContent value="ledger" className="space-y-3">
          <EmployeeLedgerTable rows={rows} />
        </TabsContent>

        {/* Tab 2: Advances & Installment Schedule */}
        <TabsContent value="advances" className="space-y-3">
          {advances.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
              لا توجد سلف مسجلة في ذمة هذا الموظف.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-right text-xs">
                <thead className="bg-amber-50/60 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">تاريخ السلفة</th>
                    <th className="p-3 font-mono">مبلغ السلفة</th>
                    <th className="p-3">خطة الأقساط</th>
                    <th className="p-3 font-mono">المسدد</th>
                    <th className="p-3 font-mono">المتبقي</th>
                    <th className="p-3">البيان / الملاحظات</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {advances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-600">
                        {new Date(adv.date).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-3 font-bold text-gray-900">
                        {formatCurrency(adv.totalAmount)}
                      </td>
                      <td className="p-3 font-sans text-gray-700">
                        {adv.installmentCount} أقساط ({formatCurrency(adv.monthlyInstallment)} / شهر)
                      </td>
                      <td className="p-3 font-bold text-emerald-700">
                        {formatCurrency(adv.repaidAmount)}
                      </td>
                      <td className="p-3 font-bold text-amber-800">
                        {formatCurrency(adv.remainingAmount)}
                      </td>
                      <td className="p-3 font-sans text-gray-600">
                        {adv.notes || adv.refDoc || "—"}
                      </td>
                      <td className="p-3 text-center font-sans">
                        <Badge
                          variant="outline"
                          className={
                            adv.status === "settled"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {adv.status === "settled" ? "مسددة بالكامل" : "قائمة / جاري السداد"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Payroll Slips History */}
        <TabsContent value="payroll" className="space-y-3">
          {payrollHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
              لم يتم تسجيل مسيرات رواتب منصرفة سابقة لهذا الموظف.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-right text-xs">
                <thead className="bg-emerald-50/60 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">شهر المسير</th>
                    <th className="p-3">تاريخ التحويل</th>
                    <th className="p-3">الخزينة / الحساب المصدر</th>
                    <th className="p-3 font-mono">الصافي المنصرف</th>
                    <th className="p-3">رقم السند المالي</th>
                    <th className="p-3 text-center">حالة الصرف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {payrollHistory.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900 font-sans">
                        مسير شهر {p.month}
                      </td>
                      <td className="p-3 text-gray-600">
                        {p.paidDate ? new Date(p.paidDate).toLocaleDateString("ar-EG") : "—"}
                      </td>
                      <td className="p-3 font-sans text-gray-700">
                        <span className="flex items-center gap-1">
                          <Landmark className="h-3.5 w-3.5 text-emerald-700" />
                          {p.treasuryAccountName}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-800 text-sm">
                        {formatCurrency(p.netPayable)}
                      </td>
                      <td className="p-3">
                        {p.payoutTxnId ? (
                          <Link
                            href={`/financials/transactions?search=${p.payoutTxnId}`}
                            className="text-blue-600 hover:underline font-bold"
                          >
                            {p.payoutTxnId}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-sans">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          تم الصرف بنجاح
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
