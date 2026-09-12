export const dynamic = "force-dynamic";
import Link from "next/link";
import { Scale, Plus, Warehouse, DollarSign, CheckCircle2 } from "lucide-react";
import { getRawBatches } from "@/actions/raw-batches";
import { RawBatchesTable } from "@/components/modules/procurement/raw-batches-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "سجل وارد الخام | EcoFresh",
};

export default async function RawPurchasesPage() {
  const batches = await getRawBatches();

  const totalNetWeightKg = batches.reduce(
    (acc, b) => acc + Number(b.initialQty || 0),
    0
  );
  const totalPayableEgp = batches.reduce(
    (acc, b) => acc + Number(b.totalPayableEgp || 0),
    0
  );
  const weightedAvgCost =
    totalNetWeightKg > 0 ? totalPayableEgp / totalNetWeightKg : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#012d1d] text-white shadow-sm">
            <Scale className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">سجل وارد مواد الخام الزراعية (ميزان البسكول)</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              تتبع شحنات المحاصيل الزراعية المستلمة بالمحطات وقيد اللوطات واستحقاق الموردين
            </p>
          </div>
        </div>
        <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 font-semibold shadow-sm w-full sm:w-auto">
  <Link href="/raw-purchases/new">
            <Plus className="h-4 w-4" /> تسجيل وارد خام بميزان البسكول
          </Link>
</Button>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي كمية الخام المستلمة</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalNetWeightKg.toLocaleString()} كجم
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ({(totalNetWeightKg / 1000).toFixed(2)} طن صافي)
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Warehouse className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي مستحقات الموردين (AP)</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {totalPayableEgp.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ج.م
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#012d1d]/10 text-[#012d1d]">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">متوسط تكلفة الكيلو الموزونة</p>
              <p className="text-2xl font-bold text-cyan-800 mt-1">
                {weightedAvgCost.toFixed(2)} ج.م / كجم
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <Scale className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches Table Component */}
      <RawBatchesTable batches={batches} />
    </div>
  );
}
