import React from "react";
import { Trash2, AlertTriangle, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getWasteAnalytics } from "@/lib/data/waste-analytics";
import { WasteFilterBar } from "@/components/modules/inventory/waste-filter-bar";
import { WasteKpiCards } from "@/components/modules/inventory/waste-kpi-cards";
import { StationWasteTable } from "@/components/modules/inventory/station-waste-table";
import { WasteTrendChart } from "@/components/modules/inventory/waste-trend-chart";
import { SupplierWasteTable } from "@/components/modules/inventory/supplier-waste-table";
import { SuppliesWasteCard } from "@/components/modules/inventory/supplies-waste-card";
import { WasteOperationsTable } from "@/components/modules/inventory/waste-operations-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مركز مراقبة وتكاليف الهالك | EcoFresh",
};

interface PageProps {
  searchParams: {
    period?: string;
    startDate?: string;
    endDate?: string;
    stationId?: string;
  };
}

export default async function WasteMonitoringPage({ searchParams }: PageProps) {
  const [stations, analytics] = await Promise.all([
    prisma.station.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getWasteAnalytics({
      period: searchParams.period || "monthly",
      startDate: searchParams.startDate,
      endDate: searchParams.endDate,
      stationId: searchParams.stationId || "all",
    }),
  ]);

  const isOverStandard = analytics.overallWastePct > analytics.standardWastePct;
  const hasNoData = analytics.operationsCount === 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                مركز مراقبة وتكاليف الهالك (Waste Monitoring Hub)
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                متابعة هالك الخامات والمستلزمات، احتساب التكاليف المباشرة بالجنيه المصري، ومقارنة كفاءة المحطات وتوزيع الفاقد
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-rose-100 text-rose-900 border border-rose-300 px-3 py-1.5 rounded-lg font-bold">
            مركز التحكم والتحليل المالي للهالك
          </span>
        </div>
      </div>

      {/* Global Filter Bar */}
      <WasteFilterBar
        stations={stations}
        currentPeriod={analytics.currentPeriod.period}
        currentStationId={analytics.selectedStationId}
        startDateStr={analytics.currentPeriod.startDateStr}
        endDateStr={analytics.currentPeriod.endDateStr}
        periodLabel={analytics.currentPeriod.label}
      />

      {/* Exceptional Alert Banner if High Waste */}
      {isOverStandard && !hasNoData && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex items-center justify-between text-xs text-rose-950 shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0" />
            <span>
              تنبيه تشغيلي: نسبة هالك الخام الإجمالية ({analytics.overallWastePct.toFixed(1)}%) أعلى من النسبة المعيارية المستهدفة ({analytics.standardWastePct.toFixed(1)}%) خلال هذه الفترة.
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <WasteKpiCards
        totalRawWasteKg={analytics.totalRawWasteKg}
        totalRawWasteEgp={analytics.totalRawWasteEgp}
        totalSuppliesWasteEgp={analytics.totalSuppliesWasteEgp}
        grandTotalWasteLoss={analytics.grandTotalWasteLoss}
        overallWastePct={analytics.overallWastePct}
        standardWastePct={analytics.standardWastePct}
        operationsCount={analytics.operationsCount}
        comparison={analytics.comparison}
      />

      {/* Empty State or Analytical Content */}
      {hasNoData ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3 shadow-sm">
          <div className="flex justify-center">
            <div className="p-3 bg-gray-100 rounded-full text-gray-400">
              <Inbox className="h-8 w-8" />
            </div>
          </div>
          <h3 className="text-base font-bold text-gray-800">
            لا توجد سجلات هالك مسجلة خلال الفترة المحددة
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            لم يتم العثور على أوامر تشغيل أو فاقد خامات مسجل في الفترة من {analytics.currentPeriod.label}. يمكنك تغيير خيارات الفلترة الزمنية أو اختيار محطة أخرى.
          </p>
        </div>
      ) : (
        <>
          {/* Waste Trend Timeline */}
          <WasteTrendChart
            trend={analytics.trend}
            periodLabel={analytics.currentPeriod.label}
          />

          {/* Station Analysis Benchmark */}
          <StationWasteTable benchmarks={analytics.stationBenchmarks} />

          {/* Detailed Waste Operations Table */}
          <WasteOperationsTable operations={analytics.detailedOperations} />

          {/* Grid: Supplier Attribution & Supplies Waste Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SupplierWasteTable suppliers={analytics.suppliersList} />
            </div>
            <div>
              <SuppliesWasteCard totalSuppliesWasteEgp={analytics.totalSuppliesWasteEgp} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
