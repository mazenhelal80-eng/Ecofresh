import React from "react";
import { formatCurrency } from "@/lib/currency";
import { NarrativeReportData } from "@/lib/reports/types";

interface NarrativeReportPrintViewProps {
  data: NarrativeReportData;
}

export function NarrativeReportPrintView({ data }: NarrativeReportPrintViewProps) {
  const {
    periodType,
    periodLabel,
    stationName,
    isStationFiltered,
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

  const periodTypeAr =
    periodType === "weekly"
      ? "أسبوعي (Weekly)"
      : periodType === "monthly"
      ? "شهري (Monthly)"
      : periodType === "yearly"
      ? "سنوي (Yearly)"
      : "فترة مخصصة (Custom)";

  return (
    <div className="print-document hidden print:block text-black bg-white font-sans" dir="rtl">
      {/* 1. OFFICIAL REPORT HEADER */}
      <header className="report-header border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black">
              EcoFresh — إيكو فريش
            </h1>
            <p className="text-xs text-gray-700 font-medium mt-0.5">
              نظام إدارة موارد المؤسسة وتصدير الحاصلات الزراعية المجمدة
            </p>
            <h2 className="text-lg font-bold text-black mt-2">
              التقرير الإداري والتحليلي الدوري ({periodTypeAr})
            </h2>
          </div>

          <div className="text-left text-xs space-y-1 border border-gray-300 p-3 rounded bg-gray-50/50">
            <div>
              <span className="font-semibold text-gray-600">النطاق: </span>
              <strong className="text-black">
                {isStationFiltered ? `محطة ${stationName}` : "كافة المحطات"}
              </strong>
            </div>
            <div>
              <span className="font-semibold text-gray-600">الفترة: </span>
              <strong className="text-black font-mono">{periodLabel}</strong>
            </div>
            <div>
              <span className="font-semibold text-gray-600">تاريخ الطباعة: </span>
              <strong className="text-black font-mono">{generatedAt}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* 2. TOP KPI SUMMARY TABLE */}
      <section className="report-section mb-6">
        <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
          ملخص المؤشرات القياسية الرئيسية (Key Performance Indicators)
        </h3>
        <table className="w-full text-xs border border-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="p-2 border-l border-gray-300 text-right font-bold">المنتج التام والتصافي</th>
              <th className="p-2 border-l border-gray-300 text-right font-bold">فاقد الفرز ونسبة الهالك</th>
              <th className="p-2 border-l border-gray-300 text-right font-bold">إيراد التصدير</th>
              <th className="p-2 border-l border-gray-300 text-right font-bold">صافي الأرباح المقدرة</th>
              <th className="p-2 border-l border-gray-300 text-right font-bold">المقبوضات النقدية</th>
              <th className="p-2 text-right font-bold">مستحقات العملاء القائمة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border-l border-gray-300 font-mono">
                <strong>{rawHubData.production.totalFinishedProducedKg.toLocaleString()}</strong> كجم
                <div className="text-[10px] text-gray-600">تصافي: {rawHubData.production.overallYieldPct}%</div>
              </td>
              <td className="p-2 border-l border-gray-300 font-mono">
                <strong>{rawHubData.waste.totalRawWasteKg.toLocaleString()}</strong> كجم
                <div className="text-[10px] text-gray-600">هالك: {rawHubData.waste.overallWastePct.toFixed(1)}%</div>
              </td>
              <td className="p-2 border-l border-gray-300 font-mono">
                <strong>{formatCurrency(rawHubData.sales.totalRevenueEgp, { decimals: 0 })}</strong>
                <div className="text-[10px] text-gray-600">{rawHubData.sales.shipmentsCount} شحنات</div>
              </td>
              <td className="p-2 border-l border-gray-300 font-mono">
                <strong>{formatCurrency(rawHubData.sales.totalProfitEgp, { decimals: 0 })}</strong>
                <div className="text-[10px] text-gray-600">هامش: {rawHubData.sales.avgMarginPct.toFixed(1)}%</div>
              </td>
              <td className="p-2 border-l border-gray-300 font-mono">
                <strong>{formatCurrency(rawHubData.financial.cashFlow.inflowEgp, { decimals: 0 })}</strong>
                <div className="text-[10px] text-gray-600">تحصيلات مؤكدة</div>
              </td>
              <td className="p-2 font-mono">
                <strong>{formatCurrency(rawHubData.financial.receivables.remainingEgp, { decimals: 0 })}</strong>
                <div className="text-[10px] text-gray-600">ذمم مدينة قائمة</div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 3. SECTION 1: EXECUTIVE SUMMARY */}
      <section className="report-section mb-6">
        <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
          1. الملخص التنفيذي العام (Executive Summary)
        </h3>
        <div className="p-3 bg-gray-50 border border-gray-300 rounded text-xs leading-relaxed whitespace-pre-line text-justify">
          {executiveSummary}
        </div>
      </section>

      {/* 4. SECTION 2: OPERATIONAL PERFORMANCE */}
      <section className="report-section mb-6">
        <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
          2. الأداء التشغيلي وحركة المخزون والتصنيع
        </h3>
        <p className="text-xs leading-relaxed whitespace-pre-line text-justify text-gray-800">
          {operationalNarrative}
        </p>
      </section>

      {/* 5. SECTION 3: FINANCIAL PERFORMANCE */}
      <section className="report-section mb-6">
        <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
          3. الأداء المالي، هوامش الربحية والسيولة النقدية
        </h3>
        <p className="text-xs leading-relaxed whitespace-pre-line text-justify text-gray-800">
          {financialNarrative}
        </p>
      </section>

      {/* 6. SECTION 4: PERIOD-OVER-PERIOD COMPARISON */}
      <section className="report-section mb-6">
        <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
          4. مقارنة الأداء بالفترة السابقة (Period-over-Period Comparison)
        </h3>
        <p className="text-xs leading-relaxed whitespace-pre-line text-justify text-gray-800 mb-3">
          {comparisonNarrative}
        </p>

        <table className="w-full text-xs border border-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 font-bold">
              <th className="p-2 border-l border-gray-300 text-right">المؤشر</th>
              <th className="p-2 border-l border-gray-300 text-right">الفترة الحالية</th>
              <th className="p-2 border-l border-gray-300 text-right">الفترة السابقة</th>
              <th className="p-2 border-l border-gray-300 text-right">الفارق</th>
              <th className="p-2 text-center">نسبة التغير والاتجاه</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c, idx) => (
              <tr key={c.metricKey} className={idx % 2 === 1 ? "bg-gray-50/60" : ""}>
                <td className="p-2 border-l border-gray-300 font-bold">{c.nameAr}</td>
                <td className="p-2 border-l border-gray-300 font-mono">
                  {c.formatType === "currency"
                    ? formatCurrency(c.currentValue)
                    : `${c.currentValue.toLocaleString()} ${c.unit}`}
                </td>
                <td className="p-2 border-l border-gray-300 font-mono text-gray-700">
                  {c.formatType === "currency"
                    ? formatCurrency(c.previousValue)
                    : `${c.previousValue.toLocaleString()} ${c.unit}`}
                </td>
                <td className="p-2 border-l border-gray-300 font-mono font-semibold">
                  {c.diff > 0 ? `+` : ""}
                  {c.formatType === "currency"
                    ? formatCurrency(c.diff)
                    : `${c.diff.toLocaleString()} ${c.unit}`}
                </td>
                <td className="p-2 text-center font-mono font-bold">
                  {c.pctChange > 0 ? `+` : ""}
                  {c.pctChange}% ({c.direction === "UP" ? "ارتفاع" : c.direction === "DOWN" ? "انخفاض" : "ثبات"})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 7. SECTION 5: STATION PERFORMANCE */}
      <section className="report-section mb-6">
        <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
          5. أداء ومقارنة المحطات (Station Benchmarks)
        </h3>
        <p className="text-xs leading-relaxed whitespace-pre-line text-justify text-gray-800 mb-3">
          {stationNarrative}
        </p>

        {!isStationFiltered && rawHubData.stations.length > 0 && (
          <table className="w-full text-xs border border-gray-300 border-collapse mb-3">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 font-bold">
                <th className="p-2 border-l border-gray-300 text-right">المحطة</th>
                <th className="p-2 border-l border-gray-300 text-right">الإنتاج التام</th>
                <th className="p-2 border-l border-gray-300 text-right">نسبة التصافي</th>
                <th className="p-2 border-l border-gray-300 text-right">نسبة الهالك</th>
                <th className="p-2 border-l border-gray-300 text-right">عدد التشغيلات</th>
                <th className="p-2 text-right">تكلفة الكيلو</th>
              </tr>
            </thead>
            <tbody>
              {rawHubData.stations.map((st, idx) => (
                <tr key={st.stationId} className={idx % 2 === 1 ? "bg-gray-50/60" : ""}>
                  <td className="p-2 border-l border-gray-300 font-bold">{st.stationName}</td>
                  <td className="p-2 border-l border-gray-300 font-mono">{st.finishedProducedKg.toLocaleString()} كجم</td>
                  <td className="p-2 border-l border-gray-300 font-mono font-semibold">{st.yieldPct.toFixed(1)}%</td>
                  <td className="p-2 border-l border-gray-300 font-mono">{st.wasteRatePct.toFixed(1)}% ({st.wasteKg.toLocaleString()} كجم)</td>
                  <td className="p-2 border-l border-gray-300 font-mono">{st.operationsCount} تشغيلات</td>
                  <td className="p-2 font-mono font-bold">{st.costPerKg.toFixed(2)} ج.م/كجم</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Station Benchmarks Highlights */}
        {!isStationFiltered && (
          <div className="grid grid-cols-2 gap-2 text-xs border border-gray-300 p-2.5 bg-gray-50 rounded">
            {stationRankings.highestProductionStation && (
              <div>
                <strong>الأعلى إنتاجاً: </strong>
                {stationRankings.highestProductionStation.name} ({stationRankings.highestProductionStation.value.toLocaleString()} كجم)
              </div>
            )}
            {stationRankings.highestYieldStation && (
              <div>
                <strong>الأعلى تصافياً: </strong>
                {stationRankings.highestYieldStation.name} ({stationRankings.highestYieldStation.value.toFixed(1)}%)
              </div>
            )}
            {stationRankings.highestWasteStation && (
              <div>
                <strong>الأعلى هالكاً: </strong>
                {stationRankings.highestWasteStation.name} ({stationRankings.highestWasteStation.value.toFixed(1)}%)
              </div>
            )}
            {stationRankings.lowestCostStation && (
              <div>
                <strong>الأقل تكلفة: </strong>
                {stationRankings.lowestCostStation.name} ({stationRankings.lowestCostStation.value.toFixed(2)} ج.م/كجم)
              </div>
            )}
          </div>
        )}
      </section>

      {/* 8. SECTION 6: YEARLY MONTHLY TRENDS (When Yearly) */}
      {periodType === "yearly" && monthlyTrendsNarrative && (
        <section className="report-section mb-6">
          <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
            6. تحليل الاتجاهات والتطور الشهري على مدار العام
          </h3>
          <p className="text-xs leading-relaxed whitespace-pre-line text-justify text-gray-800 mb-3">
            {monthlyTrendsNarrative}
          </p>

          <table className="w-full text-xs border border-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 font-bold">
                <th className="p-1.5 border-l border-gray-300 text-right">الشهر</th>
                <th className="p-1.5 border-l border-gray-300 text-right">الخام المستلم</th>
                <th className="p-1.5 border-l border-gray-300 text-right">الإنتاج التام</th>
                <th className="p-1.5 border-l border-gray-300 text-right">الهالك</th>
                <th className="p-1.5 border-l border-gray-300 text-right">الشحنات</th>
                <th className="p-1.5 border-l border-gray-300 text-right">الإيراد</th>
                <th className="p-1.5 text-right">التحصيل</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTrends
                .filter((m) => m.hasActivity)
                .map((m, idx) => (
                  <tr key={m.monthIndex} className={idx % 2 === 1 ? "bg-gray-50/60" : ""}>
                    <td className="p-1.5 border-l border-gray-300 font-bold">{m.monthName}</td>
                    <td className="p-1.5 border-l border-gray-300 font-mono">{m.rawReceivedKg.toLocaleString()} كجم</td>
                    <td className="p-1.5 border-l border-gray-300 font-mono font-semibold">{m.finishedProducedKg.toLocaleString()} كجم</td>
                    <td className="p-1.5 border-l border-gray-300 font-mono">{m.wasteKg.toLocaleString()} كجم ({m.wasteRatePct}%)</td>
                    <td className="p-1.5 border-l border-gray-300 font-mono">{m.shippedQtyKg.toLocaleString()} كجم</td>
                    <td className="p-1.5 border-l border-gray-300 font-mono font-semibold">{formatCurrency(m.revenueEgp, { decimals: 0 })}</td>
                    <td className="p-1.5 font-mono">{formatCurrency(m.cashInflowEgp, { decimals: 0 })}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 9. SECTION 7: KEY GOVERNANCE OBSERVATIONS */}
      <section className="report-section mb-6">
        <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
          {periodType === "yearly" ? "7" : "6"}. أبرز الملاحظات الرقابية ونقاط المتابعة
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-800 leading-relaxed">
          {keyObservations.map((obs, idx) => (
            <li key={idx} className="pr-1">
              {obs}
            </li>
          ))}
        </ol>
      </section>

      {/* 10. SECTION 8: DATA-DRIVEN ALERTS */}
      {alerts.length > 0 && (
        <section className="report-section mb-6">
          <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
            {periodType === "yearly" ? "8" : "7"}. التنبيهات الإدارية المحسوبة بدقة ({alerts.length} تنبيهات)
          </h3>
          <table className="w-full text-xs border border-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 font-bold">
                <th className="p-2 border-l border-gray-300 text-right w-24">مستوى الأهمية</th>
                <th className="p-2 border-l border-gray-300 text-right w-44">عنوان التنبيه</th>
                <th className="p-2 border-l border-gray-300 text-right">التفاصيل والقراءة</th>
                <th className="p-2 text-right">الإجراء الإداري المقترح</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, idx) => {
                const isCrit = alert.severity === "CRITICAL";
                const isWarn = alert.severity === "WARNING";
                const severityLabel = isCrit ? "[حرج — CRITICAL]" : isWarn ? "[تحذير — WARNING]" : "[ملحوظة — INFO]";

                return (
                  <tr key={alert.id} className={idx % 2 === 1 ? "bg-gray-50/60" : ""}>
                    <td className="p-2 border-l border-gray-300 font-bold font-mono text-[10px]">
                      {severityLabel}
                    </td>
                    <td className="p-2 border-l border-gray-300 font-bold">{alert.title}</td>
                    <td className="p-2 border-l border-gray-300 text-gray-800">
                      {alert.description} <strong className="font-mono">({alert.currentValue})</strong>
                    </td>
                    <td className="p-2 text-gray-800 font-medium">{alert.actionRecommendation}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* 11. SECTION 9: ACTIONABLE RECOMMENDATIONS */}
      <section className="report-section mb-8">
        <h3 className="report-section-title text-sm font-bold border-b border-gray-400 pb-1 mb-2">
          {periodType === "yearly" ? "9" : "8"}. التوصيات الإدارية المقترحة
        </h3>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-800 leading-relaxed">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="pr-1">
              {rec}
            </li>
          ))}
        </ul>
      </section>

      {/* 12. OFFICIAL SIGNATURES & FOOTER */}
      <footer className="report-footer border-t-2 border-black pt-4 mt-8 break-inside-avoid">
        <div className="grid grid-cols-3 gap-6 text-center text-xs mb-6">
          <div className="border border-gray-300 p-3 rounded h-24 flex flex-col justify-between">
            <span className="font-bold text-gray-700">إعداد / التحليل المالي</span>
            <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto" />
            <span className="text-[10px] text-gray-500">التوقيع والتاريخ</span>
          </div>

          <div className="border border-gray-300 p-3 rounded h-24 flex flex-col justify-between">
            <span className="font-bold text-gray-700">مراجعة / الإدارة المالية</span>
            <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto" />
            <span className="text-[10px] text-gray-500">التوقيع والتاريخ</span>
          </div>

          <div className="border border-gray-300 p-3 rounded h-24 flex flex-col justify-between">
            <span className="font-bold text-gray-700">اعتماد / المدير العام</span>
            <div className="border-b border-dotted border-gray-400 w-3/4 mx-auto" />
            <span className="text-[10px] text-gray-500">التوقيع والختم</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-gray-200 pt-2">
          <span>EcoFresh ERP — نظام إدارة التصدير والإنتاج | Mazen Helal&Omar said  Software</span>
          <span>تم الاستخراج آلياً بتاريخ {generatedAt}</span>
        </div>
      </footer>
    </div>
  );
}
