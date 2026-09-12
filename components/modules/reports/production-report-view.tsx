"use client";

import React, { useState } from "react";
import { Factory, Scale, Package, Trash2, TrendingUp, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { ProductionReportData, StationProductionMetric } from "@/lib/reports/types";

interface ProductionReportViewProps {
  data: ProductionReportData;
}

type SortField = 'finishedOutputKg' | 'rawInputKg' | 'wasteKg' | 'yieldPct' | 'costPerKg';

export function ProductionReportView({ data }: ProductionReportViewProps) {
  const [sortField, setSortField] = useState<SortField>('finishedOutputKg');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedStations = [...data.stationBreakdown].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Production KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">إجمالي الخام الوارد</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {data.totalRawReceivedKg.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">كجم</span>
            </div>
            <p className="text-[11px] text-muted-foreground">إجمالي توريدات المزارع</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">الخام المسحوب للتشغيل</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {data.totalRawProcessedKg.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">كجم</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{data.operationsCount} أوامر تشغيل</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">المنتج التام المصنع</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {data.totalFinishedProducedKg.toLocaleString()}
              </span>
              <span className="text-xs text-emerald-600">كجم</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold">
              نسبة التصافي (Yield): {data.overallYieldPct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">متوسط تكلفة التصنيع</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-foreground">
                {data.avgCostPerKg.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">ج.م / كجم</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              شامل الخام والمستلزمات وأتعاب التشغيل
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Station Comparison Benchmark */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-foreground">مقارنة كفاءة الإنتاج والتصافي بين المحطات</h3>
              <p className="text-xs text-muted-foreground">مقارنة حجم الإنتاج الفعلي، نسب الاستخلاص وتكلفة الكيلو جرام</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium">ترتيب حسب:</span>
            <button
              type="button"
              onClick={() => handleSort('finishedOutputKg')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                sortField === 'finishedOutputKg' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              الإنتاج
            </button>
            <button
              type="button"
              onClick={() => handleSort('yieldPct')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                sortField === 'yieldPct' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              نسبة التصافي
            </button>
            <button
              type="button"
              onClick={() => handleSort('costPerKg')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                sortField === 'costPerKg' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              التكلفة / كجم
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 font-bold text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3">المحطة</th>
                <th className="p-3 font-mono">الخام المسحوب (كجم)</th>
                <th className="p-3 font-mono text-emerald-600 dark:text-emerald-400">الإنتاج التام (كجم)</th>
                <th className="p-3 font-mono text-rose-600">الهالك (كجم)</th>
                <th className="p-3 font-mono">نسبة التصافي (Yield)</th>
                <th className="p-3 font-mono">التكلفة الإجمالية</th>
                <th className="p-3 font-mono">التكلفة / كجم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {sortedStations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground font-sans">
                    لا توجد تشغيلات منفذة في هذه الفترة.
                  </td>
                </tr>
              ) : (
                sortedStations.map((st) => (
                  <tr key={st.stationId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-sans font-bold text-foreground">{st.stationName}</td>
                    <td className="p-3 text-foreground font-semibold">{st.rawInputKg.toLocaleString()} كجم</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">
                      {st.finishedOutputKg.toLocaleString()} كجم
                    </td>
                    <td className="p-3 text-rose-600 font-bold">{st.wasteKg.toLocaleString()} كجم</td>
                    <td className="p-3 font-bold text-foreground">{st.yieldPct.toFixed(1)}%</td>
                    <td className="p-3 text-muted-foreground">{formatCurrency(st.totalCostEgp)}</td>
                    <td className="p-3 font-bold text-foreground">{st.costPerKg.toFixed(2)} ج.م</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Product Breakdown */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <div className="border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">توزيع الإنتاج حسب الصنف والمواصفة</h3>
          <p className="text-xs text-muted-foreground">أصناف الفراولة المجمدة والمنتجات النهائية المصنعة</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.productBreakdown.map((prod) => (
            <div key={prod.productName} className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{prod.productName}</span>
                <span className="text-[11px] text-muted-foreground font-mono">{prod.operationsCount} تشغيلة</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {prod.outputKg.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">كجم تام</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                متوسط التكلفة: {prod.avgCostPerKg.toFixed(2)} ج.م/كجم
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
