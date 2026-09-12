"use client";

import React, { useState } from "react";
import { FileText, Search, Building2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";
import { DetailedWasteOperation } from "@/lib/data/waste-analytics";

interface WasteOperationsTableProps {
  operations: DetailedWasteOperation[];
}

export function WasteOperationsTable({ operations }: WasteOperationsTableProps) {
  const [search, setSearch] = useState("");

  const filtered = operations.filter((op) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      op.id.toLowerCase().includes(term) ||
      op.stationName.toLowerCase().includes(term) ||
      op.rawProduct.toLowerCase().includes(term) ||
      op.finishedProduct.toLowerCase().includes(term) ||
      (op.generatedBatchId && op.generatedBatchId.toLowerCase().includes(term))
    );
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-800">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              سجل تفاصيل عمليات الفرز والهالك (Waste Operations Ledger)
            </h2>
            <p className="text-xs text-gray-500">
              تفاصيل أوامر التشغيل وكميات الفاقد والتكاليف المباشرة لكل تشغيلة
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="بحث برقم التشغيلة، المحطة، أو الصنف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pr-9 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-gray-50 font-bold text-gray-700 border-b border-gray-200">
            <tr>
              <th className="p-3">رقم العملية</th>
              <th className="p-3">التاريخ</th>
              <th className="p-3">المحطة</th>
              <th className="p-3">الصنف الخام</th>
              <th className="p-3 font-mono">الخام المسحوب</th>
              <th className="p-3 font-mono text-rose-700">كمية الهالك</th>
              <th className="p-3 font-mono text-rose-700">تكلفة الهالك</th>
              <th className="p-3 font-mono">نسبة التصافي</th>
              <th className="p-3">الباتش الناتج</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-400 font-sans">
                  لا توجد عمليات تطابق البحث ضمن الفترة المحددة.
                </td>
              </tr>
            ) : (
              filtered.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-bold text-indigo-900 font-mono">{op.id}</td>
                  <td className="p-3 text-gray-600">{op.date}</td>
                  <td className="p-3 font-sans font-medium text-gray-900">{op.stationName}</td>
                  <td className="p-3 font-sans font-medium text-gray-800">{op.rawProduct}</td>
                  <td className="p-3 text-gray-800 font-semibold">{op.rawInputKg.toLocaleString()} كجم</td>
                  <td className="p-3 text-rose-700 font-bold">{op.rawWasteKg.toLocaleString()} كجم</td>
                  <td className="p-3 text-rose-700 font-bold">{formatCurrency(op.wasteCostEgp)}</td>
                  <td className="p-3 font-bold text-gray-800">{op.yieldPercent.toFixed(1)}%</td>
                  <td className="p-3 text-gray-600 font-mono">{op.generatedBatchId || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
