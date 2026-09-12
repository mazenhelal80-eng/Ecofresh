export const dynamic = "force-dynamic";
import Link from "next/link";
import { Boxes, Plus, AlertTriangle, DollarSign, PackageCheck } from "lucide-react";
import { getSupplies } from "@/actions/supplies";
import { SupplyTable } from "@/components/modules/supplies/supply-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "المستلزمات والكراتين | EcoFresh",
};

export default async function SuppliesPage() {
  const supplies = await getSupplies();

  const totalValuation = supplies.reduce(
    (acc, s) => acc + Number(s.stock || 0) * Number(s.unitPrice || 0),
    0
  );
  const lowStockCount = supplies.filter(
    (s) => Number(s.stock || 0) < 100
  ).length;
  const totalStockUnits = supplies.reduce(
    (acc, s) => acc + Number(s.stock || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#012d1d] text-white shadow-sm">
            <Boxes className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">مستلزمات التعبئة والتغليف والكراتين</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              كتالوج الكراتين، الأكياس، بالتات التبخير ومواد التغليف التصديرية
            </p>
          </div>
        </div>
        <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 font-semibold shadow-sm w-full sm:w-auto">
  <Link href="/supplies/new">
            <Plus className="h-4 w-4" /> إضافة مستلزم جديد
          </Link>
</Button>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي أصناف المستلزمات</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {supplies.length} أصناف
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalStockUnits.toLocaleString()} قطعة/وحدة إجمالية
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <PackageCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي قيمة مخزون المستلزمات</p>
              <p className="text-2xl font-bold text-[#012d1d] mt-1">
                {totalValuation.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ج.م
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">الأصناف ذات المخزون الحرج</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  lowStockCount > 0 ? "text-amber-600" : "text-emerald-700"
                }`}
              >
                {lowStockCount} أصناف (&lt;100)
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Supplies Table Component */}
      <SupplyTable supplies={supplies} />
    </div>
  );
}
