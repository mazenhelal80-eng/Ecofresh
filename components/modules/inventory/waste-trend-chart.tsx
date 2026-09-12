"use client";

import React from "react";
import { TrendingUp, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { WasteTrendPoint } from "@/lib/data/waste-analytics";

interface WasteTrendChartProps {
  trend: WasteTrendPoint[];
  periodLabel: string;
}

export function WasteTrendChart({ trend, periodLabel }: WasteTrendChartProps) {
  if (trend.length === 0) {
    return null;
  }

  const maxKg = Math.max(...trend.map((t) => t.wasteKg), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-800">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              مسار ومنحنى الهالك التشغيلي (Waste Trend Timeline)
            </h2>
            <p className="text-xs text-gray-500">
              توزيع كميات وتكاليف الفاقد زمنياً عبر: {periodLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Bars Container */}
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 items-end min-h-[160px] pb-2">
          {trend.map((pt) => {
            const heightPct = Math.min(100, Math.max(8, (pt.wasteKg / maxKg) * 100));
            return (
              <div key={pt.dateKey} className="flex flex-col items-center gap-1 group">
                <div className="text-[10px] text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {pt.wasteKg.toLocaleString()} كجم
                </div>
                <div className="w-full bg-gray-100 rounded-t-lg h-32 flex items-end p-1 relative">
                  <div
                    className="w-full bg-rose-500 hover:bg-rose-600 rounded-t transition-all duration-300"
                    style={{ height: `${heightPct}%` }}
                    title={`${pt.dateLabel}: ${pt.wasteKg.toLocaleString()} كجم (${formatCurrency(pt.wasteCostEgp)})`}
                  />
                </div>
                <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center">
                  {pt.dateLabel}
                </span>
                <span className="text-[9px] font-mono text-gray-400 truncate w-full text-center">
                  {pt.wasteKg > 0 ? `${(pt.wasteKg / 1000).toFixed(1)} طن` : '0'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
