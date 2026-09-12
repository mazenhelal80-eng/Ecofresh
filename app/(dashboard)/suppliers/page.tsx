import Link from "next/link";
import { Truck, Plus, Sprout, PackageCheck, Boxes } from "lucide-react";
import { getSuppliers } from "@/actions/suppliers";
import { SupplierTable } from "@/components/modules/suppliers/supplier-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "دليل الموردين | EcoFresh",
};

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  const rawCount = suppliers.filter(
    (s) => s.type === "RAW_AGRICULTURAL"
  ).length;
  const finishedCount = suppliers.filter(
    (s) => s.type === "FINISHED_GOODS"
  ).length;
  const packagingCount = suppliers.filter(
    (s) => s.type === "PACKAGING"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#012d1d] text-white shadow-sm">
            <Truck className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">دليل الموردين والمزارع</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              إدارة وتصنيف موردي الخام الزراعي، مصانع الصفقات، وموردي مواد التغليف
            </p>
          </div>
        </div>
        <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 font-semibold shadow-sm w-full sm:w-auto">
  <Link href="/suppliers/new">
            <Plus className="h-4 w-4" /> إضافة مورد جديد
          </Link>
</Button>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">موردو المواد الخام الزراعية</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">
                {rawCount} مزارع / شركات
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Sprout className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">موردو البضاعة الجاهزة (صفقات)</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">
                {finishedCount} مصانع
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <PackageCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">موردو المستلزمات والكرتون</p>
              <p className="text-2xl font-bold text-purple-800 mt-1">
                {packagingCount} مصانع
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
              <Boxes className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Supplier Table */}
      <SupplierTable suppliers={suppliers} />
    </div>
  );
}
