import React from "react";
import { ArrowRightLeft, Truck, Package, Building2 } from "lucide-react";
import { getStockTransfersPaginated, getTransferModalData } from "@/actions/transfers";
import { TransferModal } from "@/components/modules/inventory/transfer-modal";
import { TransferLogTable } from "@/components/modules/inventory/transfer-log-table";
import { PaginationControls } from "@/components/modules/common/pagination-controls";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "التحويلات بين المحطات | EcoFresh",
};

interface InterStationTransfersPageProps {
  searchParams: {
    page?: string;
  };
}

export default async function InterStationTransfersPage({ searchParams }: InterStationTransfersPageProps) {
  const user = await requirePagePermission('inventory.transfer');
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 25;

  const [paginatedData, modalData, aggResult] = await Promise.all([
    getStockTransfersPaginated(page, pageSize),
    getTransferModalData(),
    prisma.stockTransfer.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { qtyKg: true },
      _count: { transferId: true },
    }),
  ]);

  const totalQtyTransferredKg = Number(aggResult._sum.qtyKg || 0);
  const totalTransfersCount = aggResult._count.transferId || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#012d1d] text-white shadow-sm">
            <ArrowRightLeft className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">سجل التحويلات اللوجستية بين المحطات</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              إصدار وتتبع أذون نقل المنتجات التامة المبردة بين محطات EcoFresh التابعة
            </p>
          </div>
        </div>
        <TransferModal
          stations={modalData.stations}
          batches={modalData.batches}
          fgBatches={modalData.fgBatches}
          rawBatches={modalData.rawBatches}
          stationSupplies={modalData.stationSupplies}
        />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي كمية التحويلات</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
                {totalQtyTransferredKg.toLocaleString()} كجم
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ({(totalQtyTransferredKg / 1000).toFixed(2)} طن صافي)
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي أذون النقل المنفذة</p>
              <p className="text-2xl font-bold text-[#012d1d] mt-1 font-mono">
                {totalTransfersCount} أذون
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">المحطات النشطة بالنقل</p>
              <p className="text-2xl font-bold text-amber-700 mt-1 font-mono">
                {modalData.stations.length} محطة
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Log Table & Pagination */}
      <div className="space-y-0">
        <TransferLogTable transfers={paginatedData.transfers} userRole={user?.role} />
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
