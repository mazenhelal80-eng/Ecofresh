export const dynamic = "force-dynamic";
import Link from "next/link";
import { Cpu, Plus, CheckCircle, Scale, DollarSign, Layers, Calendar } from "lucide-react";
import { OperationsTable } from "@/components/modules/processing/operations-table";
import { PaginationControls } from "@/components/modules/common/pagination-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProcessingOperationsPaginated } from "@/actions/processing";
import { getCurrentUser, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "عمليات التدوير والفرز | EcoFresh",
};

interface ProcessingOperationsPageProps {
  searchParams: {
    page?: string;
    period?: string;
  };
}

export default async function ProcessingOperationsPage({ searchParams }: ProcessingOperationsPageProps) {
  const user = await requirePagePermission('operations.view');
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const period = searchParams.period || "THIS_MONTH";
  const pageSize = 25;

  // Build Date Filter Condition
  const now = new Date();
  let dateFilter: any = undefined;

  if (period === "TODAY") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateFilter = { gte: startOfDay };
  } else if (period === "THIS_WEEK") {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    dateFilter = { gte: startOfWeek };
  } else if (period === "THIS_MONTH") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = { gte: startOfMonth };
  }

  const kpiWhereCondition: any = {
    status: { not: "CANCELLED" },
  };
  if (dateFilter) {
    kpiWhereCondition.date = dateFilter;
  }

  const [paginatedData, kpiAggregates] = await Promise.all([
    getProcessingOperationsPaginated(page, pageSize, kpiWhereCondition),
    prisma.processingOperation.aggregate({
      where: kpiWhereCondition,
      _count: { id: true },
      _sum: {
        rawInputKg: true,
        finishedOutputKg: true,
        grandTotalCost: true,
      },
      _avg: {
        yieldPercent: true,
      },
    }),
  ]);

  const totalOpsCount = kpiAggregates._count.id || 0;
  const totalRawInputKg = Number(kpiAggregates._sum.rawInputKg || 0);
  const totalFinishedOutputKg = Number(kpiAggregates._sum.finishedOutputKg || 0);
  const totalGrandCost = Number(kpiAggregates._sum.grandTotalCost || 0);

  // Overall Yield % = (Total Finished Output / Total Raw Input) * 100
  const overallYieldPct = totalRawInputKg > 0
    ? (totalFinishedOutputKg / totalRawInputKg) * 100
    : Number(kpiAggregates._avg.yieldPercent || 0);

  const formattedOperations = paginatedData.operations.map((op: any) => ({
    id: op.id,
    stationName: op.station?.name || op.stationId,
    contractorName: op.contractor?.name || op.contractorId,
    rawProduct: op.rawProduct,
    finishedProduct: op.finishedProduct,
    rawInputKg: Number(op.rawInputKg),
    finishedOutputKg: Number(op.finishedOutputKg),
    yieldPct: Number(op.yieldPercent),
    grandTotalCost: Number(op.grandTotalCost),
    unitCostPerKg: Number(op.costPerKg),
    date: new Date(op.date).toLocaleDateString("ar-EG"),
    status: op.status,
  }));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#012d1d] text-white shadow-sm">
            <Cpu className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">سجل عمليات الإنتاج والتدوير والفرز</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              متابعة تشغيل خطوط الفرز والإنتاج، تحويل الخام لمنتج تام، وحساب التكاليف المباشرة لحظياً
            </p>
          </div>
        </div>
        <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 font-semibold shadow-sm w-full sm:w-auto">
  <Link href="/processing-operations/new">
            <Plus className="h-4 w-4" /> معالج إضافة عملية جديدة (Wizard)
          </Link>
</Button>
      </div>

      {/* Period Filter Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <Calendar className="h-4 w-4 text-[#012d1d]" />
          <span>النطاق الزمني لمؤشرات الأداء (KPIs):</span>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg text-xs font-bold">
          <Link
            href="/processing-operations?period=TODAY"
            className={`px-3 py-1.5 rounded-md transition-colors ${period === "TODAY" ? "bg-[#012d1d] text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"}`}
          >
            اليوم
          </Link>
          <Link
            href="/processing-operations?period=THIS_WEEK"
            className={`px-3 py-1.5 rounded-md transition-colors ${period === "THIS_WEEK" ? "bg-[#012d1d] text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"}`}
          >
            هذا الأسبوع
          </Link>
          <Link
            href="/processing-operations?period=THIS_MONTH"
            className={`px-3 py-1.5 rounded-md transition-colors ${period === "THIS_MONTH" ? "bg-[#012d1d] text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"}`}
          >
            هذا الشهر (الافتراضي)
          </Link>
          <Link
            href="/processing-operations?period=ALL"
            className={`px-3 py-1.5 rounded-md transition-colors ${period === "ALL" ? "bg-[#012d1d] text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"}`}
          >
            كل الفترات
          </Link>
        </div>
      </div>

      {/* Dynamic Live KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي عمليات التشغيل النشطة</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">{totalOpsCount} تشغيلات</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي الخام المسحوب</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">{totalRawInputKg.toLocaleString()} كجم</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <Scale className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">نسبة التصافي الموزونة (Yield)</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{overallYieldPct.toFixed(1)}%</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي تكاليف التشغيل المباشرة</p>
              <p className="text-2xl font-bold text-[#012d1d] mt-1 font-mono">{totalGrandCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#012d1d]/10 text-[#012d1d]">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Table & Pagination */}
      <div className="space-y-0">
        <OperationsTable operations={formattedOperations} userRole={user?.role} />
        <PaginationControls
          currentPage={paginatedData.page}
          totalPages={paginatedData.totalPages}
          totalCount={paginatedData.totalCount}
          pageSize={paginatedData.pageSize}
        />
      </div>
    </div>
  );
}
