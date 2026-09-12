import React from "react";
import Link from "next/link";
import { PlusCircle, Ship, Package, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getShipmentsDataPaginated } from "@/actions/shipments";
import { ShipmentsTable } from "@/components/modules/shipments/shipments-table";
import { PaginationControls } from "@/components/modules/common/pagination-controls";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الشحنات والتصدير | EcoFresh",
};

interface ShipmentsPageProps {
  searchParams: {
    page?: string;
  };
}

export default async function ShipmentsPage({ searchParams }: ShipmentsPageProps) {
  const user = await getCurrentUser();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = 25;

  const paginatedData = await getShipmentsDataPaginated(page, pageSize);
  const orders = paginatedData.clientOrders || [];
  const batches = paginatedData.finishedGoodsBatches || [];

  const openOrdersCount = orders.filter((o: any) => Number(o.unfulfilledQtyKg) > 0).length;
  const readyBatchesCount = batches.length;
  const totalUnfulfilledKg = orders.reduce((sum: number, o: any) => sum + Number(o.unfulfilledQtyKg), 0);

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#012d1d] flex items-center gap-2">
              <Ship className="h-6 w-6 text-[#012d1d]" />
              الشحنات والتصدير البحرية
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-0.5 rounded-full font-bold">
              مركز إدارة وتجهيز الشحنات
            </span>
          </div>
          <p className="text-xs text-gray-500">
            متابعة استخراج شحنات التصدير، سحب اللوطات المتاحة من مخزن الجاهز، وتجهيز الحاويات المبردة.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white font-bold text-xs gap-2 shadow-sm">
  <Link href="/shipments/new">
              <PlusCircle className="h-4 w-4" />
              + إنشاء شحنة تصدير جديدة
            </Link>
</Button>
        </div>
      </div>

      {/* Operational KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">طلبيات التصدير المفتوحة</span>
            <Ship className="h-5 w-5 text-[#012d1d]" />
          </div>
          <div className="text-2xl font-bold text-[#012d1d] font-mono">
            {openOrdersCount} <span className="text-xs font-normal text-gray-500 font-sans">طلبيات</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium block">
            بإجمالي رصيد متبقي: {totalUnfulfilledKg.toLocaleString()} كجم
          </span>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">لوطات الجاهز المتاحة</span>
            <Package className="h-5 w-5 text-blue-700" />
          </div>
          <div className="text-2xl font-bold text-blue-800 font-mono">
            {readyBatchesCount} <span className="text-xs font-normal font-sans">باتش جاهز</span>
          </div>
          <span className="text-[11px] text-blue-700 font-medium block">
            متاح للسحب الفوري بالثلاجات
          </span>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">خطوات المعالج المتاحة</span>
            <Package className="h-5 w-5 text-amber-700" />
          </div>
          <div className="text-2xl font-bold text-amber-800 font-mono">
            3 <span className="text-xs font-normal font-sans">خطوات معالجة</span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium block">
            طلب العميل ← التخصيص ← المصروفات
          </span>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-gray-500">
            <span className="text-xs font-semibold">حالة التحقق المالي</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="text-xl font-bold text-emerald-800 font-mono">
            جاهز <span className="text-xs font-normal font-sans">لـ M19</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium block">
            حساب فوري للأرباح والهامش
          </span>
        </div>
      </div>

      {/* Main Table & Pagination */}
      <div className="space-y-0">
        <ShipmentsTable clientOrders={orders} finishedGoodsBatches={batches} userRole={user?.role} />
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
