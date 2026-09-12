"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, ExternalLink, FileText, Landmark } from "lucide-react";
import { EmployeeStatementRow } from "@/types/employee";
import { formatCurrency } from "@/lib/currency";

interface EmployeeLedgerTableProps {
  rows: EmployeeStatementRow[];
}

export function EmployeeLedgerTable({ rows }: EmployeeLedgerTableProps) {
  if (rows.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
        <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        لا توجد حركات مالية مسجلة لهذا الموظف حتى الآن.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-right text-xs">
        <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
          <tr>
            <th className="p-3.5">التاريخ</th>
            <th className="p-3.5">نوع الحركة</th>
            <th className="p-3.5">البيان / الملاحظات</th>
            <th className="p-3.5">الخزينة / الحساب البنكي</th>
            <th className="p-3.5">رقم السند المالي</th>
            <th className="p-3.5 font-mono text-emerald-800">مستحق للموظف (+)</th>
            <th className="p-3.5 font-mono text-rose-800">منصرف / مخصوم (-)</th>
            <th className="p-3.5 font-mono text-left">الرصيد التراكمي</th>
            <th className="p-3.5 text-center">الحالة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 font-mono">
          {rows.map((row) => {
            const isCancelled = row.isCancelled;
            return (
              <tr
                key={row.id}
                className={
                  isCancelled
                    ? "bg-gray-50/80 text-gray-400 line-through"
                    : "hover:bg-gray-50/70 transition-colors text-gray-800"
                }
              >
                <td className="p-3.5 font-mono text-gray-600 whitespace-nowrap">
                  {new Date(row.date).toLocaleDateString("ar-EG")}
                </td>

                <td className="p-3.5 font-sans font-bold whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    {row.dueAmount > 0 ? (
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
                    )}
                    <span>{row.type}</span>
                  </span>
                </td>

                <td className="p-3.5 font-sans max-w-xs truncate text-gray-700">
                  {row.notes || row.refDoc || "—"}
                </td>

                <td className="p-3.5 font-sans whitespace-nowrap text-gray-700">
                  {row.treasuryAccountName ? (
                    <span className="flex items-center gap-1 text-emerald-900 font-medium">
                      <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                      {row.treasuryAccountName}
                    </span>
                  ) : (
                    <span className="text-gray-400">حركة إدارية غير نقدية</span>
                  )}
                </td>

                <td className="p-3.5 font-mono whitespace-nowrap">
                  {row.financialTransactionId ? (
                    <Link
                      href={`/financials/transactions?search=${row.financialTransactionId}`}
                      className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <span>{row.financialTransactionId}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                <td className="p-3.5 font-bold text-emerald-700 whitespace-nowrap">
                  {row.dueAmount > 0
                    ? `+${formatCurrency(row.dueAmount)}`
                    : "—"}
                </td>

                <td className="p-3.5 font-bold text-rose-700 whitespace-nowrap">
                  {row.paidAmount > 0
                    ? `-${formatCurrency(row.paidAmount)}`
                    : "—"}
                </td>

                <td className="p-3.5 font-bold font-mono text-left whitespace-nowrap">
                  <span
                    className={
                      row.balance > 0
                        ? "text-emerald-700"
                        : row.balance < 0
                        ? "text-rose-700"
                        : "text-gray-600"
                    }
                  >
                    {formatCurrency(row.balance)}
                  </span>
                </td>

                <td className="p-3.5 text-center font-sans whitespace-nowrap">
                  <Badge
                    variant="outline"
                    className={
                      isCancelled
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {row.status}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
