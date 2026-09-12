import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getStationsPerformanceReport } from "@/lib/data/reports";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const stations = await getStationsPerformanceReport();
    const workbook = XLSX.utils.book_new();

    const stationsData = stations.map((st) => ({
      "كود المحطة": st.id,
      "اسم المحطة": st.name,
      "الموقع": st.location,
      "الطاقة التخزينية (كجم)": st.coldStorageCapacityKg,
      "تعريفة الكهرباء (ج.م/كجم)": st.electricityRatePerKg,
      "عدد العمليات المنفذة": st.operationsCount,
      "إجمالي وارد الخام (كجم)": st.totalRawInputKg,
      "إجمالي المنتج التام (كجم)": st.totalFinishedOutputKg,
      "إجمالي الهالك (كجم)": st.totalRawWasteKg,
      "متوسط نسبة التصافي": `${st.averageYieldPct.toFixed(1)}%`,
      "متوسط نسبة الهالك": `${st.averageWastePct.toFixed(1)}%`,
      "متوسط تكلفة الكيلوجرام (ج.م)": Math.round(st.averageCostPerKg * 100) / 100,
    }));

    const ws = XLSX.utils.json_to_sheet(stationsData);
    XLSX.utils.book_append_sheet(workbook, ws, "كفاءة وأداء المحطات");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="EcoFresh-Stations-Performance.xlsx"',
      },
    });
  } catch (error) {
    console.error("Failed to export stations report:", error);
    return NextResponse.json({ error: "فشل تصدير تقرير أداء المحطات" }, { status: 500 });
  }
}
