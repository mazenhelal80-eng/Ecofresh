import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAragingReport } from "@/lib/data/reports";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { buckets, customers, payables } = await getAragingReport();
    const workbook = XLSX.utils.book_new();

    // 1. Buckets Overview
    const overviewData = [
      { "فترة الاستحقاق": "0 إلى 30 يوم", "إجمالي المستحقات (ج.م)": buckets.bucket0to30 },
      { "فترة الاستحقاق": "31 إلى 60 يوم", "إجمالي المستحقات (ج.م)": buckets.bucket31to60 },
      { "فترة الاستحقاق": "أكثر من 60 يوم", "إجمالي المستحقات (ج.م)": buckets.bucket60plus },
      { "فترة الاستحقاق": "إجمالي الذمم المدينة القائمة (AR)", "إجمالي المستحقات (ج.م)": buckets.totalArOutstanding },
      { "فترة الاستحقاق": "إجمالي الالتزامات القائمة (AP)", "إجمالي المستحقات (ج.م)": buckets.totalApOutstanding },
    ];
    const wsOverview = XLSX.utils.json_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, wsOverview, "ملخص فترات الاستحقاق");

    // 2. Customers AR
    const custData = customers.map((c) => ({
      "كود العميل": c.customerId,
      "اسم العميل": c.customerName,
      "الدولة": c.country,
      "الحد الائتماني (ج.م)": c.creditLimit,
      "إجمالي المطالبات (ج.م)": c.totalDue,
      "إجمالي المحصل (ج.م)": c.totalCollected,
      "الرصيد المتبقي (ج.م)": c.outstandingBalance,
      "فترة الاستحقاق": c.bucket === "0-30" ? "0 - 30 يوم" : c.bucket === "31-60" ? "31 - 60 يوم" : "أكثر من 60 يوم",
      "آخر حركة": c.lastMovementRelative,
    }));
    const wsCust = XLSX.utils.json_to_sheet(custData);
    XLSX.utils.book_append_sheet(workbook, wsCust, "ذمم العملاء AR");

    // 3. Payables AP
    const payData = payables.map((p) => ({
      "كود الطرف": p.partyId,
      "اسم الطرف": p.partyName,
      "نوع الطرف": p.partyType,
      "التصنيف": p.category === "SUPPLIER" ? "مورد خام" : "مقاول تشغيل",
      "إجمالي المستحق له (ج.م)": p.totalDue,
      "إجمالي المسدد له (ج.م)": p.totalPaid,
      "الرصيد المتبقي له (ج.م)": p.outstandingBalance,
      "آخر حركة": p.lastMovementRelative,
    }));
    const wsPay = XLSX.utils.json_to_sheet(payData);
    XLSX.utils.book_append_sheet(workbook, wsPay, "التزامات الموردين AP");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="EcoFresh-AR-AP-Aging.xlsx"',
      },
    });
  } catch (error) {
    console.error("Failed to export aging report:", error);
    return NextResponse.json({ error: "فشل تصدير تقرير أعمار الديون" }, { status: 500 });
  }
}
