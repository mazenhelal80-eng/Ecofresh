import React from "react";
import Link from "next/link";
import {
  BarChart3,
  Factory,
  Trash2,
  Warehouse,
  ShoppingBag,
  Ship,
  Wallet,
  Building2,
  Lightbulb,
  ExternalLink,
  TrendingUp,
  Clock,
  Users,
  FileText,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCompleteReportData } from "@/lib/reports/services";
import { generateNarrativeReport } from "@/lib/reports/narrative-engine";
import { ReportGlobalFilter } from "@/components/modules/reports/report-global-filter";
import { NarrativeReportView } from "@/components/modules/reports/narrative-report-view";
import { ExecutiveReportView } from "@/components/modules/reports/executive-report-view";
import { ProductionReportView } from "@/components/modules/reports/production-report-view";
import { InventoryReportView } from "@/components/modules/reports/inventory-report-view";
import { ProcurementReportView } from "@/components/modules/reports/procurement-report-view";
import { SalesReportView } from "@/components/modules/reports/sales-report-view";
import { FinancialReportView } from "@/components/modules/reports/financial-report-view";
import { StationPerformanceView } from "@/components/modules/reports/station-performance-view";
import { ManagementInsightsView } from "@/components/modules/reports/management-insights-view";
import { StationWasteTable } from "@/components/modules/inventory/station-waste-table";
import { WasteTrendChart } from "@/components/modules/inventory/waste-trend-chart";
import { WasteKpiCards } from "@/components/modules/inventory/waste-kpi-cards";
import { WasteOperationsTable } from "@/components/modules/inventory/waste-operations-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مركز التقارير والتحليلات الاستراتيجية | EcoFresh",
};

interface PageProps {
  searchParams: {
    tab?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
    stationId?: string;
  };
}

export default async function StrategicReportsHubPage({ searchParams }: PageProps) {
  const currentTab = searchParams.tab || "narrative";
  const period = searchParams.period || "monthly";
  const stationId = searchParams.stationId || "all";

  const [stations, reportData] = await Promise.all([
    prisma.station.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getCompleteReportData({
      period,
      startDate: searchParams.startDate,
      endDate: searchParams.endDate,
      stationId,
    }),
  ]);

  const narrativeReport = generateNarrativeReport(reportData);

  const tabs = [
    { id: "narrative", label: "التقرير الإداري المكتوب", icon: FileText },
    { id: "executive", label: "نظرة تنفيذية شاملة", icon: BarChart3 },
    { id: "production", label: "الإنتاج والتشغيل", icon: Factory },
    { id: "waste", label: "الهالك والفاقد", icon: Trash2 },
    { id: "inventory", label: "المخزون وحركة الأرصدة", icon: Warehouse },
    { id: "procurement", label: "المشتريات والتوريدات", icon: ShoppingBag },
    { id: "sales", label: "المبيعات والتصدير", icon: Ship },
    { id: "financial", label: "المالية والتدفقات", icon: Wallet },
    { id: "stations", label: "أداء المحطات", icon: Building2 },
    { id: "insights", label: "رؤى وقرارات الإدارة", icon: Lightbulb, badge: reportData.insights.length },
  ];

  const buildTabUrl = (tabId: string) => {
    const params = new URLSearchParams();
    params.set("tab", tabId);
    if (period) params.set("period", period);
    if (stationId && stationId !== "all") params.set("stationId", stationId);
    if (period === "custom") {
      if (searchParams.startDate) params.set("startDate", searchParams.startDate);
      if (searchParams.endDate) params.set("endDate", searchParams.endDate);
    }
    return `/reports?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              مركز التقارير والتحليلات الاستراتيجية (Reports Hub)
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              منصة موحدة لاتخاذ القرار، متابعة الإنتاج، مراقبة الهالك، والتحليل المالي لعمليات التصدير
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg font-bold">
            نظام تقارير الإدارة العليا
          </span>
        </div>
      </div>

      {/* 2. Global Unified Filter Bar */}
      <div className="print:hidden">
        <ReportGlobalFilter
          stations={stations}
          currentPeriod={reportData.activePeriod.period}
          currentStationId={reportData.activePeriod.selectedStationId}
          currentTab={currentTab}
          startDateStr={reportData.activePeriod.startDateStr}
          endDateStr={reportData.activePeriod.endDateStr}
          periodLabel={reportData.activePeriod.label}
        />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border text-xs scrollbar-none print:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={buildTabUrl(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg font-bold transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? "border-primary bg-card text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* 4. Active Tab Content Rendering */}
      <div>
        {currentTab === "narrative" && (
          <NarrativeReportView data={narrativeReport} />
        )}

        {currentTab === "executive" && (
          <ExecutiveReportView data={reportData.executive} />
        )}

        {currentTab === "production" && (
          <ProductionReportView data={reportData.production} />
        )}

        {currentTab === "waste" && (
          <div className="space-y-6">
            <WasteKpiCards
              totalRawWasteKg={reportData.waste.totalRawWasteKg}
              totalRawWasteEgp={reportData.waste.totalRawWasteEgp}
              totalSuppliesWasteEgp={reportData.waste.totalSuppliesWasteEgp}
              grandTotalWasteLoss={reportData.waste.grandTotalWasteLoss}
              overallWastePct={reportData.waste.overallWastePct}
              standardWastePct={reportData.waste.standardWastePct}
              operationsCount={reportData.waste.operationsCount}
              comparison={reportData.waste.comparison}
            />
            <WasteTrendChart
              trend={reportData.waste.trend}
              periodLabel={reportData.activePeriod.label}
            />
            <StationWasteTable benchmarks={reportData.waste.stationBenchmarks} />
            <WasteOperationsTable operations={reportData.waste.detailedOperations} />
          </div>
        )}

        {currentTab === "inventory" && (
          <InventoryReportView data={reportData.inventory} />
        )}

        {currentTab === "procurement" && (
          <ProcurementReportView data={reportData.procurement} />
        )}

        {currentTab === "sales" && (
          <SalesReportView data={reportData.sales} />
        )}

        {currentTab === "financial" && (
          <FinancialReportView data={reportData.financial} />
        )}

        {currentTab === "stations" && (
          <StationPerformanceView stations={reportData.stations} />
        )}

        {currentTab === "insights" && (
          <ManagementInsightsView insights={reportData.insights} />
        )}
      </div>

      {/* 5. Deep Strategic Reports Links Footer */}
      <div className="pt-6 border-t border-border print:hidden">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <span>التقارير المالية والتشغيلية المتخصصة:</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Link
            href="/reports/profitability"
            className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors flex items-center justify-between font-medium"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              ربحية الشحنات والحاويات
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>

          <Link
            href="/reports/stations"
            className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors flex items-center justify-between font-medium"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              مراقبة كفاءة المحطات
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>

          <Link
            href="/reports/suppliers"
            className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors flex items-center justify-between font-medium"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              بطاقة جودة وأداء الموردين
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>

          <Link
            href="/reports/aging"
            className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors flex items-center justify-between font-medium"
          >
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              أعمار ديون العملاء (AR Aging)
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
