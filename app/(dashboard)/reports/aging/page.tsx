export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { getAragingReport } from "@/lib/data/reports";
import { AgingReportView } from "@/components/modules/reports/aging-report-view";
import { ArrowRight, Clock } from "lucide-react";

export const metadata = {
  title: "تقرير أعمار الديون والمستحقات AR/AP | EcoFresh",
};

export default async function CustomerArAgingReportPage() {
  const { buckets, customers, payables } = await getAragingReport();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/reports" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              مركز التقارير
            </Link>
            <span>/</span>
            <span>أعمار الديون والالتزامات</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            تقرير أعمار الديون والالتزامات المالية (AR / AP Aging)
          </h1>
          <p className="text-muted-foreground mt-1">
            متابعة مستحقات الشركة طرف العملاء والتزامات الشركة للموردين ومقاولي التشغيل حسب فترات الاستحقاق
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto print:hidden">
          <a
            href="/api/export/excel/aging"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
          >
            تصدير إكسيل (Excel)
          </a>
        </div>
      </div>

      {/* Main Aging Report View with Tabs */}
      <AgingReportView
        buckets={buckets}
        customers={customers}
        payables={payables}
      />
    </div>
  );
}
