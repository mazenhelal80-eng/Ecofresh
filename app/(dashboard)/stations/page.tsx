export const dynamic = "force-dynamic";
import Link from "next/link";
import { Building2, Plus, Warehouse, Zap, HardHat } from "lucide-react";
import { getStations } from "@/actions/stations";
import { StationCard } from "@/components/modules/stations/station-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { requirePagePermission } from "@/lib/auth";

export const metadata = {
  title: "المحطات والمخازن | EcoFresh",
};

export default async function StationsPage() {
  await requirePagePermission('stations.view');
  const stations = await getStations();

  const totalCapacityKg = stations.reduce(
    (acc, s) => acc + Number(s.coldStorageCapacityKg || 0),
    0
  );
  const avgElectricityRate =
    stations.length > 0
      ? stations.reduce((acc, s) => acc + Number(s.electricityRatePerKg || 0), 0) /
        stations.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#012d1d] text-white shadow-sm">
            <Building2 className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">المحطات ومخازن التبريد</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              إدارة محطات التجميد وتبريد الخضراوات والفواكه والتكاليف التشغيلية
            </p>
          </div>
        </div>
        <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 font-semibold shadow-sm w-full sm:w-auto">
  <Link href="/stations/new">
            <Plus className="h-4 w-4" /> إضافة محطة جديدة
          </Link>
</Button>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي المحطات المسجلة</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stations.length} محطات</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي الطاقة التخزينية</p>
              <p className="text-2xl font-bold text-[#012d1d] mt-1">
                {totalCapacityKg.toLocaleString()} كجم
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <Warehouse className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">متوسط تعريفة الكهرباء</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {avgElectricityRate.toFixed(2)} ج.م / كجم
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stations Cards Grid */}
      {stations.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
              <Building2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">لا توجد محطات مسجلة حالياً</h3>
            <p className="text-sm text-gray-500 max-w-md">
              قم بإضافة أول محطة تبريد وتجميد لتتمكن من ربط مقاولي العمالة وحساب تكاليف التشغيل والكهرباء.
            </p>
            <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2">
  <Link href="/stations/new" className="pt-2">
                <Plus className="h-4 w-4" /> إضافة أول محطة
              </Link>
</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stations.map((station) => (
            <StationCard key={station.id} station={station as any} />
          ))}
        </div>
      )}
    </div>
  );
}
