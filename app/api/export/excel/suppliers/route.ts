import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSuppliersPerformanceReport } from "@/lib/data/reports";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const suppliers = await getSuppliersPerformanceReport();
    const workbook = XLSX.utils.book_new();

    const suppliersData = suppliers.map((sup) => ({
      "كود المورد": sup.code || sup.id,
      "اسم المورد": sup.name,
      "نوع المورد": sup.type,
      "الحالة": sup.status,
      "عدد التوريدات": sup.batchesCount,
      "المقبول (APPROVED)": sup.approvedCount,
      "تحت الفحص (PENDING)": sup.pendingCount,
      "المرفوض (REJECTED)": sup.rejectedCount,
      "إجمالي الكمية الموردة (كجم)": sup.totalQtySupplied,
      "إجمالي حجم التعامل (ج.م)": sup.totalVolumeEgp,
      "نسبة اعتماد الجودة": `${sup.approvalRatePct.toFixed(1)}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(suppliersData);
    XLSX.utils.book_append_sheet(workbook, ws, "بطاقة أداء وجودة الموردين");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="EcoFresh-Suppliers-Quality.xlsx"',
      },
    });
  } catch (error) {
    console.error("Failed to export suppliers report:", error);
    return NextResponse.json({ error: "فشل تصدير تقرير الموردين" }, { status: 500 });
  }
}
