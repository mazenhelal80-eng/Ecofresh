import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCompleteReportData } from "@/lib/reports/services";
import { generateNarrativeReport } from "@/lib/reports/narrative-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "monthly";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const stationId = searchParams.get("stationId") || "all";

    const reportData = await getCompleteReportData({
      period,
      startDate,
      endDate,
      stationId,
    });

    const narrative = generateNarrativeReport(reportData);
    const workbook = XLSX.utils.book_new();

    // -------------------------------------------------------------
    // SHEET 1: Executive Summary & Overview
    // -------------------------------------------------------------
    const summaryData = [
      { "البند": "اسم النظام", "القيمة": "EcoFresh ERP — إيكو فريش" },
      { "البند": "نوع التقرير", "القيمة": period === 'weekly' ? 'أسبوعي' : period === 'monthly' ? 'شهري' : period === 'yearly' ? 'سنوي' : 'فترة مخصصة' },
      { "البند": "الفترة المحددة", "القيمة": reportData.activePeriod.label },
      { "البند": "النطاق", "القيمة": reportData.activePeriod.selectedStationName },
      { "البند": "تاريخ الإصدار", "القيمة": narrative.generatedAt },
      { "البند": "", "القيمة": "" },
      { "البند": "--- المؤشرات التشغيلية الرئيسية ---", "القيمة": "" },
      { "البند": "إجمالي الخام المستلم (كجم)", "القيمة": reportData.production.totalRawReceivedKg },
      { "البند": "إجمالي الخام المعالج (كجم)", "القيمة": reportData.production.totalRawProcessedKg },
      { "البند": "المنتج التام المصنع (كجم)", "القيمة": reportData.production.totalFinishedProducedKg },
      { "البند": "نسبة التصافي العامة (Yield %)", "القيمة": `${reportData.production.overallYieldPct}%` },
      { "البند": "فاقد الفرز والتشغيل (كجم)", "القيمة": reportData.waste.totalRawWasteKg },
      { "البند": "نسبة الهالك الإجمالية", "القيمة": `${reportData.waste.overallWastePct.toFixed(1)}%` },
      { "البند": "القيمة التقديرية لخسائر الهالك (ج.م)", "القيمة": reportData.waste.grandTotalWasteLoss },
      { "البند": "متوسط تكلفة التصنيع (ج.م/كجم)", "القيمة": reportData.production.avgCostPerKg },
      { "البند": "", "القيمة": "" },
      { "البند": "--- مؤشرات التصدير والمبيعات ---", "القيمة": "" },
      { "البند": "عدد الشحنات المصدرة", "القيمة": reportData.sales.shipmentsCount },
      { "البند": "إجمالي الكمية المصدرة (كجم)", "القيمة": reportData.sales.totalShippedKg },
      { "البند": "إيرادات التصدير (EGP)", "القيمة": reportData.sales.totalRevenueEgp },
      { "البند": "إيرادات التصدير (EUR)", "القيمة": reportData.sales.totalRevenueEur },
      { "البند": "صافي أرباح الشحنات (EGP)", "القيمة": reportData.sales.totalProfitEgp },
      { "البند": "متوسط هامش الربح", "القيمة": `${reportData.sales.avgMarginPct.toFixed(1)}%` },
      { "البند": "", "القيمة": "" },
      { "البند": "--- مؤشرات التدفقات النقدية والذمم ---", "القيمة": "" },
      { "البند": "المقبوضات النقدية بالجنيه (EGP)", "القيمة": reportData.financial.cashFlow.inflowEgp },
      { "البند": "المدفوعات النقدية بالجنيه (EGP)", "القيمة": reportData.financial.cashFlow.outflowEgp },
      { "البند": "صافي التدفق النقدي بالجنيه (EGP)", "القيمة": reportData.financial.cashFlow.netCashEgp },
      { "البند": "مستحقات العملاء القائمة (AR)", "القيمة": reportData.financial.receivables.remainingEgp },
      { "البند": "التزامات الموردين القائمة (AP)", "القيمة": reportData.financial.payables.remainingEgp },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, "الملخص التنفيذي");

    // -------------------------------------------------------------
    // SHEET 2: Production Breakdown
    // -------------------------------------------------------------
    const prodStationsData = reportData.production.stationBreakdown.map((s) => ({
      "المحطة": s.stationName,
      "الخام المسحوب (كجم)": s.rawInputKg,
      "المنتج التام (كجم)": s.finishedOutputKg,
      "الهالك (كجم)": s.wasteKg,
      "نسبة التصافي": `${s.yieldPct}%`,
      "تكلفة الكيلوجرام (ج.م)": s.costPerKg,
      "إجمالي التكلفة (ج.م)": s.totalCostEgp,
      "عدد الأوامر": s.operationsCount,
    }));
    const wsProd = XLSX.utils.json_to_sheet(prodStationsData.length > 0 ? prodStationsData : [{ "تنبيه": "لا توجد بيانات إنتاج" }]);
    XLSX.utils.book_append_sheet(workbook, wsProd, "إنتاج المحطات");

    // -------------------------------------------------------------
    // SHEET 3: Export Sales & Customers
    // -------------------------------------------------------------
    const salesData = reportData.sales.customers.map((c) => ({
      "اسم العميل": c.customerName,
      "الدولة": c.country,
      "عدد الشحنات": c.shipmentsCount,
      "الكمية المصدرة (كجم)": c.totalQtyKg,
      "الإيرادات (ج.م)": c.totalRevenueEgp,
      "صافي الربح (ج.م)": c.totalProfitEgp,
      "هامش الربح": `${c.avgMarginPct}%`,
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData.length > 0 ? salesData : [{ "تنبيه": "لا توجد شحنات مسجلة" }]);
    XLSX.utils.book_append_sheet(workbook, wsSales, "المبيعات والتصدير");

    // -------------------------------------------------------------
    // SHEET 4: Procurement & Suppliers
    // -------------------------------------------------------------
    const procurementData = reportData.procurement.suppliers.map((sup) => ({
      "المورد": sup.supplierName,
      "نوع المورد": sup.supplierType,
      "عدد اللوطات": sup.batchesCount,
      "الكمية الموردة (كجم)": sup.totalQtyKg,
      "إجمالي المشتريات (ج.م)": sup.totalSpendEgp,
      "متوسط سعر الكيلوجرام (ج.م)": sup.avgPricePerKg,
      "الحصة من المشتريات": `${sup.shareOfSpendPct}%`,
    }));
    const wsProc = XLSX.utils.json_to_sheet(procurementData.length > 0 ? procurementData : [{ "تنبيه": "لا توجد مشتريات مسجلة" }]);
    XLSX.utils.book_append_sheet(workbook, wsProc, "المشتريات والموردين");

    // -------------------------------------------------------------
    // SHEET 5: Station Benchmarks
    // -------------------------------------------------------------
    const stationsData = reportData.stations.map((st) => ({
      "كود المحطة": st.stationId,
      "اسم المحطة": st.stationName,
      "الموقع": st.location,
      "الخام المستلم (كجم)": st.rawReceivedKg,
      "الخام المعالج (كجم)": st.rawProcessedKg,
      "المنتج التام (كجم)": st.finishedProducedKg,
      "الهالك (كجم)": st.wasteKg,
      "نسبة الهالك": `${st.wasteRatePct}%`,
      "نسبة التصافي": `${st.yieldPct}%`,
      "تكلفة الكيلوجرام (ج.م)": st.costPerKg,
      "حالة التقييم": st.benchmarkStatus,
      "ملاحظة التقييم": st.benchmarkReason,
    }));
    const wsStations = XLSX.utils.json_to_sheet(stationsData);
    XLSX.utils.book_append_sheet(workbook, wsStations, "تقييم المحطات");

    // -------------------------------------------------------------
    // SHEET 6: Monthly Trends (if Yearly / Multi-month)
    // -------------------------------------------------------------
    if (reportData.monthlyTrends && reportData.monthlyTrends.length > 0) {
      const trendsData = reportData.monthlyTrends.map((m) => ({
        "الشهر": m.monthName,
        "الخام المستلم (كجم)": m.rawReceivedKg,
        "الخام المعالج (كجم)": m.rawProcessedKg,
        "المنتج التام (كجم)": m.finishedProducedKg,
        "الهالك (كجم)": m.wasteKg,
        "نسبة الهالك": `${m.wasteRatePct}%`,
        "الكمية المصدرة (كجم)": m.shippedQtyKg,
        "إيراد التصدير (ج.م)": m.revenueEgp,
        "المقبوضات النقدية (ج.م)": m.cashInflowEgp,
        "المدفوعات النقدية (ج.م)": m.cashOutflowEgp,
        "صافي السيولة (ج.م)": m.netCashEgp,
      }));
      const wsTrends = XLSX.utils.json_to_sheet(trendsData);
      XLSX.utils.book_append_sheet(workbook, wsTrends, "الاتجاهات الشهرية");
    }

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const safePeriodStr = reportData.activePeriod.startDateStr;
    const filename = `EcoFresh-Report-${period}-${safePeriodStr}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate complete report excel export:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تصدير ملف الإكسيل للتقرير" },
      { status: 500 }
    );
  }
}
