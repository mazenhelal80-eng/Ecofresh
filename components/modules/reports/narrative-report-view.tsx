"use client";

import React, { useState } from "react";
import {
  FileText,
  Printer,
  Copy,
  Check,
  Building2,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Factory,
  Trash2,
  Ship,
  Wallet,
  Scale,
  Award,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { NarrativeReportData } from "@/lib/reports/types";
import { NarrativeReportPrintView } from "./narrative-report-print-view";

interface NarrativeReportViewProps {
  data: NarrativeReportData;
}

export function NarrativeReportView({ data }: NarrativeReportViewProps) {
  const [copied, setCopied] = useState(false);

  const {
    periodType,
    periodLabel,
    stationName,
    isStationFiltered,
    hasData,
    dataAvailability,
    generatedAt,
    executiveSummary,
    operationalNarrative,
    financialNarrative,
    comparisonNarrative,
    stationNarrative,
    monthlyTrendsNarrative,
    keyObservations,
    alerts,
    recommendations,
    comparisons,
    stationRankings,
    monthlyTrends,
    rawHubData,
  } = data;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const textContent = `
==================================================
📋 تقرير إداري — EcoFresh ERP (إيكو فريش)
الفترة: ${periodLabel} (${periodType === 'weekly' ? 'أسبوعي' : periodType === 'monthly' ? 'شهري' : periodType === 'yearly' ? 'سنوي' : 'فترة مخصصة'})
النطاق: ${isStationFiltered ? `محطة ${stationName}` : 'كافة المحطات'}
تاريخ الإصدار: ${generatedAt}
==================================================

1. الملخص التنفيذي:
------------------
${executiveSummary}

2. الأداء التشغيلي والمخزون:
---------------------------
${operationalNarrative}

3. الأداء المالي وإدارة السيولة:
------------------------------
${financialNarrative}

4. مقارنة الأداء بالفترة السابقة:
-------------------------------
${comparisonNarrative}

5. أداء ومقارنة المحطات:
------------------------
${stationNarrative}
${monthlyTrendsNarrative ? `\n6. تحليل الاتجاهات الشهرية:\n-------------------------\n${monthlyTrendsNarrative}\n` : ''}
7. أبرز الملاحظات الرقابية:
--------------------------
${keyObservations.map((obs, idx) => `${idx + 1}. ${obs}`).join('\n')}

8. التنبيهات الإدارية:
--------------------
${alerts.length > 0 ? alerts.map((a, idx) => `[${a.severity}] ${a.title}: ${a.description} (التوصية: ${a.actionRecommendation})`).join('\n\n') : 'كافة المؤشرات ضمن الحدود المستهدفة.'}

9. التوصيات الإدارية المقترحة:
-----------------------------
${recommendations.map((rec, idx) => `• ${rec}`).join('\n')}

==================================================
نظام إدارة التصدير — EcoFresh ERP
تم التطوير والإشراف بواسطة: Mazen Helal&Omar said
==================================================
    `.trim();

    navigator.clipboard.writeText(textContent).then(() => {
      setCopied(true);
      toast.success("تم نسخ نص التقرير الإداري بالكامل إلى الحافظة");
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <>
      {/* SCREEN INTERACTIVE VIEW */}
      <div className="space-y-6 print:hidden" dir="rtl">
        {/* 1. Header Toolbar Banner */}
      <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
            <FileText className="h-7 w-7 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                التقرير الإداري السردي المكتوب
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {periodType === "weekly"
                  ? "أسبوعي (Weekly)"
                  : periodType === "monthly"
                  ? "شهري (Monthly)"
                  : periodType === "yearly"
                  ? "سنوي (Yearly)"
                  : "فترة مخصصة"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {periodLabel}
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {isStationFiltered ? `محطة: ${stationName}` : "كل المحطات"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                تاريخ الإصدار: {generatedAt}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs font-bold gap-1.5 h-9"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                تم النسخ
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                نسخ التقرير
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="bg-[#012d1d] hover:bg-[#02472e] text-white text-xs font-bold gap-1.5 h-9 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            طباعة التقرير (A4)
          </Button>
        </div>
      </div>

      {/* 2. Top Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Production */}
        <Card className="border-border bg-card">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Factory className="h-3.5 w-3.5 text-primary" />
              المنتج التام
            </span>
            <p className="text-lg font-bold font-mono text-foreground">
              {rawHubData.production.totalFinishedProducedKg.toLocaleString()} <span className="text-xs font-normal">كجم</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              تصافي: {rawHubData.production.overallYieldPct}%
            </p>
          </CardContent>
        </Card>

        {/* 2. Wastage */}
        <Card className="border-border bg-card">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              فاقد الفرز
            </span>
            <p className="text-lg font-bold font-mono text-rose-600">
              {rawHubData.waste.totalRawWasteKg.toLocaleString()} <span className="text-xs font-normal">كجم</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              نسبة الهالك: {rawHubData.waste.overallWastePct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* 3. Export Revenue */}
        <Card className="border-border bg-card">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Ship className="h-3.5 w-3.5 text-emerald-600" />
              إيراد التصدير
            </span>
            <p className="text-base font-bold font-mono text-emerald-600">
              {formatCurrency(rawHubData.sales.totalRevenueEgp, { decimals: 0 })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {rawHubData.sales.shipmentsCount} شحنات مصدرة
            </p>
          </CardContent>
        </Card>

        {/* 4. Net Profit */}
        <Card className="border-border bg-card">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              صافي الأرباح
            </span>
            <p className="text-base font-bold font-mono text-primary">
              {formatCurrency(rawHubData.sales.totalProfitEgp, { decimals: 0 })}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">
              هامش: {rawHubData.sales.avgMarginPct.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* 5. Cash Inflow */}
        <Card className="border-border bg-card">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
              المقبوضات
            </span>
            <p className="text-base font-bold font-mono text-emerald-600">
              {formatCurrency(rawHubData.financial.cashFlow.inflowEgp, { decimals: 0 })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              تحصيلات الصادرات
            </p>
          </CardContent>
        </Card>

        {/* 6. Outstanding Receivables */}
        <Card className="border-border bg-card">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Scale className="h-3.5 w-3.5 text-amber-600" />
              مستحقات العملاء
            </span>
            <p className="text-base font-bold font-mono text-amber-600">
              {formatCurrency(rawHubData.financial.receivables.remainingEgp, { decimals: 0 })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              ذمم مدينة قائمة (AR)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Section 1: Executive Summary */}
      <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-sm">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-3">
            <Sparkles className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <h3 className="text-base font-bold text-foreground">
              1. الملخص التنفيذي العام (Executive Summary)
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-line font-medium">
            {executiveSummary}
          </p>
        </CardContent>
      </Card>

      {/* 4. Two-Column Operational & Financial Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 2: Operational Performance */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Factory className="h-5 w-5 text-primary shrink-0" />
              <h3 className="text-base font-bold text-foreground">
                2. الأداء التشغيلي وحركة المخزون
              </h3>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {operationalNarrative}
            </p>
          </CardContent>
        </Card>

        {/* Section 3: Financial Performance */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Wallet className="h-5 w-5 text-emerald-600 shrink-0" />
              <h3 className="text-base font-bold text-foreground">
                3. الأداء المالي والسيولة النقدية
              </h3>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {financialNarrative}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 5. Section 4: Period-over-Period Performance Comparisons */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              <h3 className="text-base font-bold text-foreground">
                4. مقارنة الأداء بالفترة السابقة (Period-over-Period Comparison)
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              مقارنة رقمية دقيقة ونسب التغير
            </span>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {comparisonNarrative}
          </p>

          {/* Comparison Table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border text-muted-foreground">
                  <th className="p-2.5 font-bold">المؤشر</th>
                  <th className="p-2.5 font-bold">الفترة الحالية</th>
                  <th className="p-2.5 font-bold">الفترة السابقة</th>
                  <th className="p-2.5 font-bold">الفارق</th>
                  <th className="p-2.5 font-bold text-center">نسبة التغير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisons.map((c) => (
                  <tr key={c.metricKey} className="hover:bg-muted/20">
                    <td className="p-2.5 font-bold text-foreground">{c.nameAr}</td>
                    <td className="p-2.5 font-mono">
                      {c.formatType === "currency"
                        ? formatCurrency(c.currentValue)
                        : `${c.currentValue.toLocaleString()} ${c.unit}`}
                    </td>
                    <td className="p-2.5 font-mono text-muted-foreground">
                      {c.formatType === "currency"
                        ? formatCurrency(c.previousValue)
                        : `${c.previousValue.toLocaleString()} ${c.unit}`}
                    </td>
                    <td className="p-2.5 font-mono font-bold">
                      {c.diff > 0 ? `+` : ""}
                      {c.formatType === "currency"
                        ? formatCurrency(c.diff)
                        : `${c.diff.toLocaleString()} ${c.unit}`}
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          c.pctChange === 0
                            ? "bg-muted text-muted-foreground"
                            : c.direction === "UP"
                            ? c.isPositiveForBusiness
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            : c.isPositiveForBusiness
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {c.pctChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : c.pctChange < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : null}
                        {c.pctChange > 0 ? `+` : ""}
                        {c.pctChange}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 6. Section 5: Station Performance & Benchmarks */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary shrink-0" />
              <h3 className="text-base font-bold text-foreground">
                5. أداء ومقارنة المحطات (Station Performance)
              </h3>
            </div>
            {stationRankings.highestProductionStation && (
              <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-md">
                الأعلى إنتاجاً: {stationRankings.highestProductionStation.name}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {stationNarrative}
          </p>

          {!isStationFiltered && rawHubData.stations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {stationRankings.highestProductionStation && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-primary" />
                    المحطة الأعلى إنتاجاً
                  </span>
                  <p className="font-bold text-sm text-foreground">
                    {stationRankings.highestProductionStation.name}
                  </p>
                  <p className="text-xs font-mono text-primary font-bold">
                    {stationRankings.highestProductionStation.value.toLocaleString()} كجم
                  </p>
                </div>
              )}

              {stationRankings.highestYieldStation && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    الأعلى في نسبة التصافي (Yield)
                  </span>
                  <p className="font-bold text-sm text-foreground">
                    {stationRankings.highestYieldStation.name}
                  </p>
                  <p className="text-xs font-mono text-emerald-600 font-bold">
                    {stationRankings.highestYieldStation.value.toFixed(1)}%
                  </p>
                </div>
              )}

              {stationRankings.highestWasteStation && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    الأعلى في نسبة الهالك
                  </span>
                  <p className="font-bold text-sm text-foreground">
                    {stationRankings.highestWasteStation.name}
                  </p>
                  <p className="text-xs font-mono text-rose-600 font-bold">
                    {stationRankings.highestWasteStation.value.toFixed(1)}%
                  </p>
                </div>
              )}

              {stationRankings.lowestCostStation && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                    الأقل في تكلفة الكيلوجرام
                  </span>
                  <p className="font-bold text-sm text-foreground">
                    {stationRankings.lowestCostStation.name}
                  </p>
                  <p className="text-xs font-mono text-foreground font-bold">
                    {stationRankings.lowestCostStation.value.toFixed(2)} ج.م/كجم
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7. Section 6: Yearly Monthly Trends (When Period === 'yearly') */}
      {periodType === "yearly" && monthlyTrendsNarrative && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Calendar className="h-5 w-5 text-primary shrink-0" />
              <h3 className="text-base font-bold text-foreground">
                6. تحليل الاتجاهات والتطور الشهري على مدار العام
              </h3>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {monthlyTrendsNarrative}
            </p>

            {/* Monthly Trend Mini-Bar Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b border-border text-muted-foreground">
                    <th className="p-2 font-bold">الشهر</th>
                    <th className="p-2 font-bold">الخام المستلم</th>
                    <th className="p-2 font-bold">الإنتاج التام</th>
                    <th className="p-2 font-bold">الهالك</th>
                    <th className="p-2 font-bold">الشحنات</th>
                    <th className="p-2 font-bold">الإيراد (EGP)</th>
                    <th className="p-2 font-bold">التحصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthlyTrends
                    .filter((m) => m.hasActivity)
                    .map((m) => (
                      <tr key={m.monthIndex} className="hover:bg-muted/20">
                        <td className="p-2 font-bold text-foreground">{m.monthName}</td>
                        <td className="p-2 font-mono">{m.rawReceivedKg.toLocaleString()} كجم</td>
                        <td className="p-2 font-mono font-bold text-primary">
                          {m.finishedProducedKg.toLocaleString()} كجم
                        </td>
                        <td className="p-2 font-mono text-rose-600">
                          {m.wasteKg.toLocaleString()} كجم ({m.wasteRatePct}%)
                        </td>
                        <td className="p-2 font-mono">{m.shippedQtyKg.toLocaleString()} كجم</td>
                        <td className="p-2 font-mono font-bold text-emerald-600">
                          {formatCurrency(m.revenueEgp, { decimals: 0 })}
                        </td>
                        <td className="p-2 font-mono text-emerald-600">
                          {formatCurrency(m.cashInflowEgp, { decimals: 0 })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8. Observations & Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Governance Observations */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Info className="h-5 w-5 text-primary shrink-0" />
              <h3 className="text-base font-bold text-foreground">
                7. أبرز الملاحظات الرقابية
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              {keyObservations.map((obs, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold font-mono">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{obs}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Actionable Recommendations */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ArrowRight className="h-5 w-5 text-emerald-600 shrink-0 rotate-180" />
              <h3 className="text-base font-bold text-foreground">
                8. التوصيات الإدارية المقترحة
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 9. Data-Driven Narrative Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>التنبيهات الإدارية المحسوبة بدقة ({alerts.length} تنبيهات):</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => {
              const isCrit = alert.severity === "CRITICAL";
              const isWarn = alert.severity === "WARNING";

              return (
                <Card
                  key={alert.id}
                  className={`border shadow-sm ${
                    isCrit
                      ? "border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/10"
                      : isWarn
                      ? "border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10"
                      : "border-border bg-card"
                  }`}
                >
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isCrit ? (
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        ) : isWarn ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : (
                          <Info className="h-4 w-4 text-primary shrink-0" />
                        )}
                        <h4 className="font-bold text-sm text-foreground">{alert.title}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                          isCrit
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            : isWarn
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {alert.currentValue}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {alert.description}
                    </p>

                    <div className="pt-2 border-t border-border/40 text-[11px] text-foreground">
                      <strong>الإجراء المقترح: </strong>
                      <span className="text-muted-foreground">{alert.actionRecommendation}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      </div>

      {/* DEDICATED REAL A4 HTML PRINT VIEW */}
      <NarrativeReportPrintView data={data} />
    </>
  );
}
