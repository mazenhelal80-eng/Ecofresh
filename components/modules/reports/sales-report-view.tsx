"use client";

import React from "react";
import { Ship, Globe, Users, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { SalesReportData } from "@/lib/reports/types";

interface SalesReportViewProps {
  data: SalesReportData;
}

export function SalesReportView({ data }: SalesReportViewProps) {
  const { shipmentsCount, totalShippedKg, totalRevenueEgp, totalRevenueEur, totalProfitEgp, avgMarginPct, customers, countriesBreakdown } = data;

  return (
    <div className="space-y-6">
      {/* 1. Sales & Export KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">الحاويات والشحنات المنفذة</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {shipmentsCount}
              </span>
              <span className="text-xs text-muted-foreground">شحنة بحرية</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{totalShippedKg.toLocaleString()} كجم مصدر</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">إجمالي إيراد التصدير (EGP)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalRevenueEgp)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              معادل اليورو: €{totalRevenueEur.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">صافي أرباح الشحنات</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-primary">
                {formatCurrency(totalProfitEgp)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">بعد خصم التكلفة الصناعية والنولون</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">متوسط هامش الربح المحقق</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {avgMarginPct.toFixed(2)}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">نسبة صافي الربح من الإيراد</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Countries Distribution Grid */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">التوزيع الجغرافي لشحنات التصدير حسب الدول</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {countriesBreakdown.map((c) => (
            <div key={c.country} className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{c.country}</span>
                <span className="text-xs text-muted-foreground font-mono">{c.shipmentsCount} حاوية</span>
              </div>
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(c.revenueEgp)}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {c.qtyKg.toLocaleString()} كجم
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Customer Portfolio Table */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <div className="border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">محفظة عملاء التصدير وربحية العمليات</h3>
          <p className="text-xs text-muted-foreground">تحليل مبيعات كل عميل، الكميات المشحونة، الإيرادات وهوامش الربح</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 font-bold text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3">اسم العميل</th>
                <th className="p-3">الدولة</th>
                <th className="p-3 font-mono text-center">عدد الشحنات</th>
                <th className="p-3 font-mono">الكمية المصدرة (كجم)</th>
                <th className="p-3 font-mono">إجمالي الإيراد (ج.م)</th>
                <th className="p-3 font-mono">صافي الربح (ج.م)</th>
                <th className="p-3 font-mono">هامش الربح %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground font-sans">
                    لا توجد شحنات تصدير مسجلة خلال الفترة المحددة.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.customerId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-sans font-bold text-foreground">{cust.customerName}</td>
                    <td className="p-3 font-sans text-muted-foreground">{cust.country}</td>
                    <td className="p-3 text-center font-bold text-foreground">{cust.shipmentsCount}</td>
                    <td className="p-3 font-semibold text-foreground">{cust.totalQtyKg.toLocaleString()} كجم</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(cust.totalRevenueEgp)}
                    </td>
                    <td className="p-3 font-bold text-primary">
                      {formatCurrency(cust.totalProfitEgp)}
                    </td>
                    <td className="p-3 font-bold text-foreground">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                        {cust.avgMarginPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
