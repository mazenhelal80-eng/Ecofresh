"use client";

import React, { useState, useMemo } from "react";
import { Building2, ArrowUpDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { StationWasteBenchmark } from "@/lib/data/waste-analytics";

interface StationWasteTableProps {
  benchmarks: StationWasteBenchmark[];
}

type SortField = 'wasteKg' | 'wasteCostEgp' | 'wasteRatePct' | 'operationsCount' | 'rawInputKg';

export function StationWasteTable({ benchmarks }: StationWasteTableProps) {
  const [sortField, setSortField] = useState<SortField>('wasteKg');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedList = useMemo(() => {
    return [...benchmarks].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [benchmarks, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-800">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              مقارنة وتحليل كفاءة المحطات وتكاليف الهالك (Station Benchmark)
            </h2>
            <p className="text-xs text-gray-500">
              تحديد المحطات ذات معدلات الفاقد المرتفعة ومقارنة التكاليف المباشرة
            </p>
          </div>
        </div>

        {/* Quick Sort Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-500 font-medium">ترتيب حسب:</span>
          <button
            type="button"
            onClick={() => handleSort('wasteKg')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
              sortField === 'wasteKg'
                ? 'bg-rose-100 text-rose-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الأعلى كمية
          </button>
          <button
            type="button"
            onClick={() => handleSort('wasteCostEgp')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
              sortField === 'wasteCostEgp'
                ? 'bg-rose-100 text-rose-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الأعلى تكلفة
          </button>
          <button
            type="button"
            onClick={() => handleSort('wasteRatePct')}
            className={`px-2.5 py-1 rounded-md font-bold transition-all ${
              sortField === 'wasteRatePct'
                ? 'bg-rose-100 text-rose-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الأعلى نسبة هالك
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-gray-50 font-bold text-gray-700 border-b border-gray-200">
            <tr>
              <th className="p-3">المحطة</th>
              <th
                onClick={() => handleSort('rawInputKg')}
                className="p-3 cursor-pointer hover:bg-gray-100 font-mono"
              >
                إجمالي الخام المستلم (كجم)
              </th>
              <th
                onClick={() => handleSort('wasteKg')}
                className="p-3 cursor-pointer hover:bg-gray-100 font-mono text-rose-700"
              >
                كمية الهالك (كجم)
              </th>
              <th
                onClick={() => handleSort('wasteCostEgp')}
                className="p-3 cursor-pointer hover:bg-gray-100 font-mono text-rose-700"
              >
                التكلفة المالية (ج.م)
              </th>
              <th
                onClick={() => handleSort('wasteRatePct')}
                className="p-3 cursor-pointer hover:bg-gray-100 font-mono"
              >
                نسبة الهالك الفعلية
              </th>
              <th
                onClick={() => handleSort('operationsCount')}
                className="p-3 cursor-pointer hover:bg-gray-100 font-mono text-center"
              >
                عدد التشغيلات
              </th>
              <th className="p-3 text-center">التقييم الفني</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono">
            {sortedList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400 font-sans">
                  لا توجد محطات لديها تشغيلات مسجلة خلال الفترة المحددة.
                </td>
              </tr>
            ) : (
              sortedList.map((st) => (
                <tr
                  key={st.stationId}
                  className={`hover:bg-gray-50 transition-colors ${
                    st.isProblematic ? 'bg-rose-50/30' : ''
                  }`}
                >
                  <td className="p-3 font-sans font-bold text-gray-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span>{st.stationName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">({st.stationId})</span>
                  </td>
                  <td className="p-3 text-gray-800 font-semibold">
                    {st.rawInputKg.toLocaleString()} كجم
                  </td>
                  <td className="p-3 text-rose-700 font-bold">
                    {st.wasteKg.toLocaleString()} كجم
                  </td>
                  <td className="p-3 text-rose-700 font-bold">
                    {formatCurrency(st.wasteCostEgp)}
                  </td>
                  <td className="p-3 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        st.isProblematic
                          ? 'bg-rose-100 text-rose-900 font-bold'
                          : 'text-gray-900'
                      }`}
                    >
                      {st.wasteRatePct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-gray-700">
                    {st.operationsCount}
                  </td>
                  <td className="p-3 text-center font-sans">
                    {st.isProblematic ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                        محطة حرجة (تجاوز المعيار)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        أداء تشغيلي منضبط
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
