"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Award,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  Coins,
  FileText,
  HandCoins,
  MinusCircle,
  Phone,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { EmployeeForm } from "./EmployeeForm";
import { AddAdvanceDialog } from "./AddAdvanceDialog";
import { ProcessPayrollDialog } from "./ProcessPayrollDialog";
import { formatCurrency } from "@/lib/currency";

interface EmployeeListProps {
  employees: any[];
  stations: any[];
  treasuryAccounts: any[];
}

export function EmployeeList({
  employees,
  stations,
  treasuryAccounts,
}: EmployeeListProps) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [stationFilter, setStationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      search === "" ||
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.id.toLowerCase().includes(search.toLowerCase()) ||
      (emp.phone && emp.phone.includes(search)) ||
      (emp.position && emp.position.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = departmentFilter === "" || emp.department === departmentFilter;
    const matchesStation = stationFilter === "" || emp.stationId === stationFilter;
    const matchesStatus = statusFilter === "" || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesStation && matchesStatus;
  });

  const totalBasicSalary = employees.reduce((s, e) => s + Number(e.basicSalary), 0);
  const totalAllowances = employees.reduce((s, e) => s + Number(e.allowances || 0), 0);
  const totalMonthlyPayroll = totalBasicSalary + totalAllowances;
  const totalOutstandingAdvances = employees.reduce(
    (s, e) => s + Number(e.outstandingAdvances || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <UserCheck className="h-7 w-7 text-[#012d1d]" />
            <span>إدارة الموظفين ومسير الرواتب (Employees & Payroll)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            إدارة الكادر البشري، احتساب وصرف مسيرات الرواتب الشهرية، ومتابعة أقساط السلف والعهد
          </p>
        </div>

        <EmployeeForm stations={stations} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center text-gray-500 mb-1">
            <span className="text-xs font-semibold">إجمالي الكادر البشري</span>
            <Users className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {employees.length}
          </div>
          <span className="text-[11px] text-gray-400">
            {employees.filter((e) => e.status === "نشط").length} موظف على رأس العمل
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center text-gray-500 mb-1">
            <span className="text-xs font-semibold">إجمالي الرواتب الشهرية التعاقدية</span>
            <Coins className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 font-mono">
            {formatCurrency(totalMonthlyPayroll)}
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            أساسي: {formatCurrency(totalBasicSalary)} + بدلات: {formatCurrency(totalAllowances)}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center text-gray-500 mb-1">
            <span className="text-xs font-semibold">إجمالي السلف القائمة على الكادر</span>
            <HandCoins className="h-5 w-5 text-amber-700" />
          </div>
          <div className="text-2xl font-bold text-amber-800 font-mono">
            {formatCurrency(totalOutstandingAdvances)}
          </div>
          <span className="text-[11px] text-gray-400">ذمم سلف جاري استقطاعها على أقساط</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center text-gray-500 mb-1">
            <span className="text-xs font-semibold">حسابات الخزينة والبنوك المرتبطة</span>
            <Building2 className="h-5 w-5 text-blue-700" />
          </div>
          <div className="text-2xl font-bold text-blue-800 font-mono">
            {treasuryAccounts.length}
          </div>
          <span className="text-[11px] text-gray-400">حسابات نشطة لصرف الرواتب والسلف</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الكود، الوظيفة أو الهاتف..."
            className="pr-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="border border-gray-200 rounded-lg py-1.5 px-3 text-xs bg-white focus:outline-none focus:border-emerald-600"
          >
            <option value="">كل الأقسام</option>
            <option value="الإنتاج">الإنتاج</option>
            <option value="المخازن">المخازن</option>
            <option value="الإدارة المالية">الإدارة المالية</option>
            <option value="مراقبة الجودة">مراقبة الجودة</option>
            <option value="الصيانة">الصيانة والخدمات</option>
            <option value="المشتريات">المشتريات واللوجستيات</option>
            <option value="الإدارة العامة">الإدارة العامة</option>
          </select>

          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="border border-gray-200 rounded-lg py-1.5 px-3 text-xs bg-white focus:outline-none focus:border-emerald-600"
          >
            <option value="">كل المحطات</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg py-1.5 px-3 text-xs bg-white focus:outline-none focus:border-emerald-600"
          >
            <option value="">كل الحالات</option>
            <option value="نشط">نشط</option>
            <option value="إجازة">في إجازة</option>
            <option value="موقوف">موقوف</option>
            <option value="منتهي الخدمة">منتهي الخدمة</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-right text-xs">
          <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
            <tr>
              <th className="p-3.5">كود الموظف</th>
              <th className="p-3.5">الاسم والوظيفة</th>
              <th className="p-3.5">القسم</th>
              <th className="p-3.5">المحطة</th>
              <th className="p-3.5 font-mono">الراتب التعاقدي</th>
              <th className="p-3.5 font-mono">السلف القائمة</th>
              <th className="p-3.5 font-mono">مسير الراتب المستحق</th>
              <th className="p-3.5 text-center">الحالة</th>
              <th className="p-3.5 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  لا يوجد موظفون مطابقون لشروط البحث.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const contractualSalary = Number(emp.basicSalary) + Number(emp.allowances || 0);
                const advances = Number(emp.outstandingAdvances || 0);
                const nextInstallment = advances > 0 ? Math.min(advances, Math.round(contractualSalary * 0.3)) : 0;
                const estimatedNetPay = Math.max(0, contractualSalary - nextInstallment);

                return (
                  <tr key={emp.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-emerald-900">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="hover:underline flex items-center gap-1"
                      >
                        {emp.id}
                      </Link>
                    </td>

                    <td className="p-3.5">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="font-bold text-gray-900 hover:text-emerald-700 transition-colors block"
                      >
                        {emp.name}
                      </Link>
                      <span className="text-[11px] text-gray-500 block">
                        {emp.position} {emp.phone && `• ${emp.phone}`}
                      </span>
                    </td>

                    <td className="p-3.5 text-gray-600">{emp.department}</td>

                    <td className="p-3.5 text-gray-600">
                      {emp.station?.name || "عام لكافة المحطات"}
                    </td>

                    <td className="p-3.5 font-mono font-bold text-gray-800">
                      <div>{formatCurrency(contractualSalary)}</div>
                      <span className="text-[10px] text-gray-400 font-normal">
                        أساسي: {formatCurrency(Number(emp.basicSalary))}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono font-bold">
                      {advances > 0 ? (
                        <div>
                          <span className="text-amber-800">{formatCurrency(advances)}</span>
                          <span className="block text-[10px] text-amber-600 font-normal font-sans">
                            قسط: {formatCurrency(nextInstallment)}/شهر
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-sans text-[11px]">لا توجد سلف</span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono font-bold text-emerald-800">
                      <div>{formatCurrency(estimatedNetPay)}</div>
                      <span className="text-[10px] text-emerald-600 font-normal font-sans">
                        صافي تقديري بعد القسط
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge
                        variant="outline"
                        className={
                          emp.status === "نشط"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }
                      >
                        {emp.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <AddAdvanceDialog
                          employeeId={emp.id}
                          employeeName={emp.name}
                          monthlySalary={contractualSalary}
                          treasuryAccounts={treasuryAccounts}
                          trigger={
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1 text-amber-800 border-amber-200 hover:bg-amber-50">
                              <HandCoins className="h-3.5 w-3.5" />
                              سلفة
                            </Button>
                          }
                        />

                        <ProcessPayrollDialog
                          employeeId={emp.id}
                          employeeName={emp.name}
                          basicSalary={Number(emp.basicSalary)}
                          allowances={Number(emp.allowances || 0)}
                          outstandingAdvances={advances}
                          treasuryAccounts={treasuryAccounts}
                          trigger={
                            <Button size="sm" className="h-7 text-xs px-2.5 gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                              <Calculator className="h-3.5 w-3.5" />
                              صرف الراتب
                            </Button>
                          }
                        />

                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 gap-1 text-gray-600 hover:text-gray-900"
                        >
                          <Link href={`/employees/${emp.id}`}>
                            <span>الملف</span>
                            <ChevronLeft className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
