export const dynamic = "force-dynamic";
import React from "react";
import Link from "next/link";
import { getStationsPerformanceReport } from "@/lib/data/reports";
import { StationsBenchmarkTable } from "@/components/modules/reports/stations-benchmark-table";
import { ArrowRight, Building2, Factory, Zap, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "مقارنة كفاءة المحطات | EcoFresh",
};

export default async function StationsPerformanceReportPage() {
  const stations = await getStationsPerformanceReport();

  const totalOps = stations.reduce((s, st) => s + st.operationsCount, 0);
  const totalInput = stations.reduce((s, st) => s + st.totalRawInputKg, 0);
  const totalOutput = stations.reduce((s, st) => s + st.totalFinishedOutputKg, 0);
  const avgGroupYield = totalInput > 0 ? (totalOutput / totalInput) * 100 : 80;

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
            <span>أداء المحطات</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            تقرير كفاءة ومقارنة أداء محطات التجميد
          </h1>
          <p className="text-muted-foreground mt-1">
            متابعة إشغال محطات التجميد، نسب التصافي والتصنيع، وتكلفة تشغيل الكيلو لكل موقع
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto print:hidden">
          <a
            href="/api/export/excel/stations"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
          >
            تصدير إكسيل (Excel)
          </a>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">عدد المحطات المسجلة</p>
            <h3 className="text-2xl font-bold text-foreground mt-1 font-mono">
              {stations.length} محطات
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">إجمالي التشغيلات المنفذة</p>
            <h3 className="text-2xl font-bold text-primary mt-1 font-mono">
              {totalOps} عملية
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">متوسط نسبة تصافي المجموعة</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {avgGroupYield.toFixed(2)}%
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Benchmark Table Component */}
      <StationsBenchmarkTable stations={stations as any} />
    </div>
  );
}
