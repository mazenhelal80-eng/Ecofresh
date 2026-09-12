"use client";

import React, { useState } from "react";
import { Building2, AlertTriangle, CheckCircle2, Award, ArrowUpDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { StationPerformanceItem } from "@/lib/reports/types";

interface StationPerformanceViewProps {
  stations: StationPerformanceItem[];
}

type SortKey = 'finishedProducedKg' | 'rawProcessedKg' | 'wasteRatePct' | 'yieldPct' | 'costPerKg';

export function StationPerformanceView({ stations }: StationPerformanceViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('finishedProducedKg');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedList = [...stations].sort((a, b) => {
    const valA = a[sortKey];
    const valB = b[sortKey];
    return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Transparent Benchmark Criteria */}
      <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">
            مصفوفة تقييم ومقارنة أداء المحطات (Station Performance Benchmark Matrix)
          </h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          يتم التقييم الفني للمحطات وفق معايير شفافة مستمدة من البيانات التشغيلية:
          <span className="font-bold text-emerald-600 dark:text-emerald-400 mx-1">أداء متميز (نسبة تصافي ≥ 82%)</span>،
          <span className="font-bold text-foreground mx-1">أداء منضبط (ضمن المستهدف المعياري)</span>،
          <span className="font-bold text-rose-600 mx-1">محطة حرجة (نسبة هالك تتجاوز 20%)</span>.
        </p>
      </div>

      {/* 2. Detailed Performance Matrix Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-sm font-bold text-foreground">جدول المقارنة التشغيلية والمخزنية</span>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">ترتيب حسب:</span>
            <button
              type="button"
              onClick={() => handleSort('finishedProducedKg')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                sortKey === 'finishedProducedKg' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              الإنتاج التام
            </button>
            <button
              type="button"
              onClick={() => handleSort('wasteRatePct')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                sortKey === 'wasteRatePct' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              نسبة الهالك
            </button>
            <button
              type="button"
              onClick={() => handleSort('yieldPct')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                sortKey === 'yieldPct' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              نسبة التصافي
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 font-bold text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3">المحطة والموقع</th>
                <th className="p-3 font-mono">الخام المستلم</th>
                <th className="p-3 font-mono">الخام المشغل</th>
                <th className="p-3 font-mono text-emerald-600 dark:text-emerald-400">الإنتاج التام</th>
                <th className="p-3 font-mono text-rose-600">الهالك</th>
                <th className="p-3 font-mono">التصافي %</th>
                <th className="p-3 font-mono">الهالك %</th>
                <th className="p-3 font-mono">رصيد التام الحالي</th>
                <th className="p-3 text-center">حالة التقييم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {sortedList.map((st) => (
                <tr key={st.stationId} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-sans font-bold text-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{st.stationName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">({st.location})</span>
                    </div>
                  </td>
                  <td className="p-3 text-foreground font-semibold">{st.rawReceivedKg.toLocaleString()} كجم</td>
                  <td className="p-3 text-foreground font-semibold">{st.rawProcessedKg.toLocaleString()} كجم</td>
                  <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">
                    {st.finishedProducedKg.toLocaleString()} كجم
                  </td>
                  <td className="p-3 text-rose-600 font-bold">{st.wasteKg.toLocaleString()} كجم</td>
                  <td className="p-3 font-bold text-foreground">{st.yieldPct.toFixed(1)}%</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      st.wasteRatePct > 20.0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600' : 'text-foreground'
                    }`}>
                      {st.wasteRatePct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 font-bold text-primary">{st.currentFinishedStockKg.toLocaleString()} كجم</td>
                  <td className="p-3 text-center font-sans">
                    {st.benchmarkStatus === 'CRITICAL' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-300">
                        <AlertTriangle className="h-3 w-3" />
                        محطة حرجة
                      </span>
                    ) : st.benchmarkStatus === 'EXCELLENT' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-300">
                        <Award className="h-3 w-3" />
                        أداء ممتاز
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        أداء اعتيادي
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
