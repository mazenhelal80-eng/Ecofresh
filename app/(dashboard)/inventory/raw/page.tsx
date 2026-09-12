export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getAvailableRawInventoryGroupsPaginated } from "@/lib/data/raw-inventory";
import { RawInventoryTable } from "@/components/modules/inventory/raw-inventory-table";
import { PaginationControls } from "@/components/modules/common/pagination-controls";
import { Package, DollarSign, Layers } from "lucide-react";

export const metadata = {
  title: "مخزن المواد الخام الزراعية | EcoFresh",
};

interface RawInventoryPageProps {
  searchParams: {
    page?: string;
  };
}

export default async function RawInventoryPage({ searchParams }: RawInventoryPageProps) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 25;

  const [paginatedData, allAvailableLots] = await Promise.all([
    getAvailableRawInventoryGroupsPaginated(page, pageSize),
    prisma.rawBatch.findMany({
      where: { availableQty: { gt: 0 } },
      select: {
        availableQty: true,
        unitCost: true,
      },
    }),
  ]);

  const totalRawKg = allAvailableLots.reduce(
    (sum, l) => sum + Number(l.availableQty || 0),
    0
  );
  const totalValue = allAvailableLots.reduce(
    (sum, l) => sum + Number(l.availableQty || 0) * Number(l.unitCost || 0),
    0
  );
  const totalLotsCount = allAvailableLots.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            مخزن المواد الخام الزراعية (Raw Materials Inventory)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            متابعة أرصدة المحاصيل الزراعية المستلمة بالمحطات، موازين البسكول، التكلفة الموزونة، وفحوصات الجودة (QC & Brix).
          </p>
        </div>
      </div>

      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold">
              إجمالي رصيد الخام المتاح في الثلاجات
            </span>
            <p className="text-2xl font-bold text-[#012d1d] mt-1 font-mono">
              {totalRawKg.toLocaleString()} كجم
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Package className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold">
              قيمة مخزون الخام التكليفية
            </span>
            <p className="text-2xl font-bold text-[#0054cd] mt-1 font-mono">
              {totalValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              ج.م
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold">
              عدد اللوطات المفتوحة
            </span>
            <p className="text-2xl font-bold text-gray-800 mt-1 font-mono">
              {totalLotsCount} لوط
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Layers className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Raw Materials Grouped Table & Group-level Pagination */}
      <div className="space-y-0">
        <RawInventoryTable groups={paginatedData.groups} />
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

