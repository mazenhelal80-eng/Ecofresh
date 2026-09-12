export const dynamic = "force-dynamic";
import { getAvailableFinishedGoodsGroupsPaginated } from "@/lib/data/inventory";
import { FgBatchTable } from "@/components/modules/inventory/fg-batch-table";
import { PaginationControls } from "@/components/modules/common/pagination-controls";
import { getCurrentUser } from "@/lib/auth";
import { Package, DollarSign, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";

interface InventoryPageProps {
  searchParams: {
    page?: string;
  };
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const user = await getCurrentUser();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 25;

  const [paginatedData, aggResult] = await Promise.all([
    getAvailableFinishedGoodsGroupsPaginated(page, pageSize),
    prisma.finishedGoodsBatch.aggregate({
      where: { availableQty: { gt: 0 } },
      _sum: {
        availableQty: true,
        totalValue: true,
      },
      _count: {
        fgBatchId: true,
      },
    }),
  ]);

  const totalQtyKg = Number(aggResult._sum.availableQty || 0);
  const totalValueEgp = Number(aggResult._sum.totalValue || 0);
  const totalBatchesCount = aggResult._count.fgBatchId || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مخزن المنتج التام (Finished Goods Inventory)</h1>
          <p className="text-sm text-gray-500 mt-1">
            متابعة رصيد الأصناف المتاحة بالمحطات، التكلفة الموزونة، وشجرة تتبع المزارعين المساهمين (DNA Traceability).
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold">إجمالي رصيد الجاهز المتاح</span>
            <p className="text-2xl font-bold text-[#012d1d] mt-1 font-mono">{totalQtyKg.toLocaleString()} كجم</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold">إجمالي القيمة التكليفية للمخزون</span>
            <p className="text-2xl font-bold text-[#0054cd] mt-1 font-mono">{totalValueEgp.toLocaleString()} ج.م</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold">عدد الباتشات الصالحة للشحن</span>
            <p className="text-2xl font-bold text-gray-800 mt-1 font-mono">{totalBatchesCount} باتش</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Layers className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Grouped Table & Group-level Pagination */}
      <div className="space-y-0">
        <FgBatchTable groups={paginatedData.groups} />
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
