import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getShipmentsProfitabilityReport } from "@/lib/data/reports";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const report = await getShipmentsProfitabilityReport();
    const { summary, shipmentsList } = report;
    const workbook = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summaryData = [
      { "البند": "إجمالي عدد الشحنات المنفذة", "القيمة": summary.shipmentsCount },
      { "البند": "إجمالي الإيرادات (ج.م)", "القيمة": summary.totalRevenue },
      { "البند": "إجمالي التكاليف التشغيلية (ج.م)", "القيمة": summary.totalCost },
      { "البند": "صافي أرباح الشحنات (ج.م)", "القيمة": summary.totalProfit },
      { "البند": "متوسط هامش الربح", "القيمة": `${summary.averageMargin.toFixed(2)}%` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, "ملخص الربحية");

    // 2. Shipments Detail Sheet
    const detailsData = shipmentsList.map((sh) => ({
      "رقم الشحنة": sh.shipmentId,
      "اسم العميل": sh.customerName,
      "رقم الحاوية": sh.containerNo || "",
      "الوزن المصدر (كجم)": sh.shippedQtyKg,
      "سعر البيع (EUR)": sh.sellingPriceEur,
      "إجمالي الإيراد (ج.م)": sh.grossRevenueEgp,
      "إجمالي التكلفة (ج.م)": sh.totalCostEgp,
      "صافي الربح (ج.م)": sh.netProfitEgp,
      "هامش الربح": `${sh.marginPercent.toFixed(1)}%`,
      "تاريخ الإبحار": sh.dispatchDate ? sh.dispatchDate.toISOString().substring(0, 10) : "",
    }));
    const wsDetails = XLSX.utils.json_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(workbook, wsDetails, "تفاصيل الشحنات والحاويات");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="EcoFresh-Shipments-Profitability.xlsx"',
      },
    });
  } catch (error) {
    console.error("Failed to export profitability report:", error);
    return NextResponse.json({ error: "فشل تصدير تقرير ربحية الشحنات" }, { status: 500 });
  }
}
