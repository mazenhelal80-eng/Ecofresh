"use client";

import React from "react";
import {
  Factory,
  Trash2,
  Ship,
  TrendingUp,
  Scale,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { ExecutiveReportData } from "@/lib/reports/types";
import { ProfitabilityChart } from "./profitability-chart";

interface ExecutiveReportViewProps {
  data: ExecutiveReportData;
}

export function ExecutiveReportView({ data }: ExecutiveReportViewProps) {
  const { production, waste, shipments, financials, comparison } = data;

  return (
    <div className="space-y-6">
      {/* 1. Top Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Production Volume */}
        <Card className="border-border bg-card">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">إجمالي الإنتاج التام المصنع</span>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Factory className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {production.finishedProducedKg.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">كجم</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {comparison.productionKgChangePct >= 0 ? (
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    <ArrowUpRight className="h-3 w-3" />
                    +{comparison.productionKgChangePct}% مقارنة بالفترة السابقة
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                    <ArrowDownRight className="h-3 w-3" />
                    {comparison.productionKgChangePct}% مقارنة بالفترة السابقة
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Waste */}
        <Card className="border-border bg-card">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">هالك الفرز والتشغيل</span>
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-rose-600">
                  {waste.wasteKg.toLocaleString()}
                </span>
                <span className="text-xs text-rose-600">كجم ({waste.wasteRatePct.toFixed(1)}%)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 font-mono">
                التكلفة: {formatCurrency(waste.wasteCostEgp)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shipped Quantities & Revenue */}
        <Card className="border-border bg-card">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">إيرادات التصدير المحققة</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <Ship className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-emerald-600">
                  {formatCurrency(shipments.revenueEgp)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {shipments.count} شحنات | {shipments.shippedQtyKg.toLocaleString()} كجم مصدرة
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit & Margin */}
        <Card className="border-border bg-card">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">صافي أرباح الشحنات</span>
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(shipments.netProfitEgp)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                متوسط هامش الربح: {shipments.avgMarginPct.toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Profitability Comparison Chart */}
      <ProfitabilityChart
        totalRevenue={shipments.revenueEgp}
        totalCost={shipments.totalCostEgp}
        totalProfit={shipments.netProfitEgp}
        averageMargin={shipments.avgMarginPct}
      />

      {/* 3. Operational & Financial Health Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operational Health */}
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Factory className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">المؤشرات التشغيلية للمصانع والمحطات</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <span className="text-muted-foreground">خام مستلم من المزارع</span>
                <p className="text-lg font-bold font-mono text-foreground">
                  {production.rawReceivedKg.toLocaleString()} كجم
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <span className="text-muted-foreground">خام مسحوب للتشغيل</span>
                <p className="text-lg font-bold font-mono text-foreground">
                  {production.rawProcessedKg.toLocaleString()} كجم
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <span className="text-muted-foreground">أوامر الفرز المنفذة</span>
                <p className="text-lg font-bold font-mono text-foreground">
                  {production.operationsCount} أوامر
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <span className="text-muted-foreground">متوسط نسبة التصافي (Yield)</span>
                <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {production.avgYieldPct.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial & Liquidity Health */}
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Wallet className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base font-bold text-foreground">المؤشرات المالية وإدارة السيولة</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <span className="text-muted-foreground">المقبوضات النقدية (Cash In)</span>
                <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(financials.cashInflowEgp)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <span className="text-muted-foreground">المدفوعات النقدية (Cash Out)</span>
                <p className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                  {formatCurrency(financials.cashOutflowEgp)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <span className="text-muted-foreground">مستحقات العملاء القائمة (AR)</span>
                <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(financials.totalArOutstandingEgp)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                <span className="text-muted-foreground">التزامات الموردين والمقاولين (AP)</span>
                <p className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                  {formatCurrency(financials.totalApOutstandingEgp)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
