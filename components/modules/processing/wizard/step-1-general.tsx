import React from "react";
import { Station, Contractor, Product } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Warehouse, Building2 } from "lucide-react";

type ExtendedStation = Station & {
  stockLocations?: Array<{
    id: string;
    type: string;
    name: string;
  }>;
};

interface Step1GeneralProps {
  stations: ExtendedStation[];
  contractors: Contractor[];
  products: Product[];
  rawBatches?: any[];
  stationId: string;
  contractorId: string;
  rawProduct: string;
  finishedProduct: string;
  date: string;
  onChange: (fields: Partial<{
    stationId: string;
    contractorId: string;
    rawProduct: string;
    finishedProduct: string;
    date: string;
  }>) => void;
  errors?: Record<string, string[]>;
}

export function Step1General({
  stations,
  contractors,
  products,
  rawBatches = [],
  stationId,
  contractorId,
  rawProduct,
  finishedProduct,
  date,
  onChange,
  errors,
}: Step1GeneralProps) {
  // All active contractors are available regardless of station
  const activeContractors = contractors.filter((c) => c.isActive !== false);

  const availableCropsAtStation = React.useMemo(() => {
    if (!rawBatches || rawBatches.length === 0) return [];
    const crops = new Set<string>();
    rawBatches
      .filter((b) => (!stationId || b.stationId === stationId) && Number(b.availableQty) > 0)
      .forEach((b) => {
        if (b.rawProduct) crops.add(b.rawProduct.trim());
      });
    return Array.from(crops);
  }, [rawBatches, stationId]);

  const selectedStation = stations.find((s) => s.id === stationId);

  const rawLocation = selectedStation?.stockLocations?.find((l) => l.type === "RAW");
  const finishedLocation = selectedStation?.stockLocations?.find((l) => l.type === "FINISHED");
  const suppliesLocation = selectedStation?.stockLocations?.find((l) => l.type === "SUPPLIES");

  const rawWarehouseName = rawLocation?.name || (selectedStation ? `${selectedStation.name} — مخزن الخامات` : "مخزن الخامات");
  const finishedWarehouseName = finishedLocation?.name || (selectedStation ? `${selectedStation.name} — مخزن المنتج التام` : "مخزن المنتج التام");
  const suppliesWarehouseName = suppliesLocation?.name || (selectedStation ? `${selectedStation.name} — مخزن المستلزمات` : "مخزن المستلزمات");

  const handleStationChange = (newStationId: string) => {
    onChange({
      stationId: newStationId,
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">الخطوة 1: البيانات العامة لعملية التشغيل</h2>
        <p className="text-xs text-gray-500 mt-1">
          تحديد محطة التشغيل والربط التلقائي بمخازنها، المقاول القائم بالعملية، وتحديد المحصول الخام والمنتج النهائي.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Station Select */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#012d1d]" />
            <span>محطة التشغيل (Station)</span>
            <span className="text-red-500">*</span>
          </Label>
          <select
            value={stationId}
            onChange={(e) => handleStationChange(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
          >
            <option value="">-- اختر المحطة --</option>
            {stations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.id}) — {st.location}
              </option>
            ))}
          </select>
          {errors?.stationId && (
            <p className="text-xs text-red-600">{errors.stationId[0]}</p>
          )}
        </div>

        {/* Contractor Select */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">
            مقاول الفرز والتشغيل (Contractor) <span className="text-red-500">*</span>
          </Label>
          <select
            value={contractorId}
            onChange={(e) => onChange({ contractorId: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
          >
            <option value="">
              {activeContractors.length === 0
                ? "-- لا يوجد مقاولون متاحون --"
                : "-- اختر مقاول التشغيل والفرز --"}
            </option>
            {activeContractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (تعريفة: {Number(c.tariffRatePerKg)} ج.م/كجم)
              </option>
            ))}
          </select>
          {errors?.contractorId && (
            <p className="text-xs text-red-600">{errors.contractorId[0]}</p>
          )}
        </div>

        {/* Automatic Station-Bound Locked Warehouses */}
        {selectedStation && (
          <div className="md:col-span-2 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#012d1d]">
              <Lock className="w-3.5 h-3.5 text-emerald-700" />
              <span>المخازن التابعة للمحطة المحددة (تعيين آلي ومقفل ومحصن في النظام):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Raw Warehouse */}
              <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                  <span>مخزن الخامات المصدر</span>
                  <Lock className="w-3 h-3 text-emerald-700" />
                </div>
                <strong className="text-xs text-gray-900 block font-mono">
                  {rawWarehouseName}
                </strong>
                <span className="text-[10px] text-gray-500 block">سحب لوطات الخام المعتمدة</span>
              </div>

              {/* Finished Warehouse */}
              <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-800">
                  <span>مخزن المنتج التام الناتج</span>
                  <Lock className="w-3 h-3 text-blue-700" />
                </div>
                <strong className="text-xs text-gray-900 block font-mono">
                  {finishedWarehouseName}
                </strong>
                <span className="text-[10px] text-gray-500 block">إيداع باتش الإنتاج الجاهز</span>
              </div>

              {/* Supplies Warehouse */}
              <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
                  <span>مخزن المستلزمات والتعبئة</span>
                  <Lock className="w-3 h-3 text-amber-700" />
                </div>
                <strong className="text-xs text-gray-900 block font-mono">
                  {suppliesWarehouseName}
                </strong>
                <span className="text-[10px] text-gray-500 block">صرف مواد التعبئة والتغليف</span>
              </div>
            </div>
          </div>
        )}

        {/* Raw Product Select */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">
            المحصول / الخام المسحوب <span className="text-red-500">*</span>
          </Label>
          <select
            value={rawProduct}
            onChange={(e) => onChange({ rawProduct: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
          >
            <option value="">-- اختر المحصول المسحوب من مخزن المحطة --</option>
            {availableCropsAtStation.length > 0 ? (
              availableCropsAtStation.map((crop) => (
                <option key={crop} value={crop}>
                  {crop} (متاح بمخزن المحطة)
                </option>
              ))
            ) : (
              <>
                <option value="فراولة خام">فراولة خام</option>
                <option value="برتقال صيفي خام">برتقال صيفي خام</option>
                <option value="برتقال أبو سرة خام">برتقال أبو سرة خام</option>
                <option value="مانجو كيت خام">مانجو كيت خام</option>
                <option value="رمان خام">رمان خام</option>
                <option value="خضار مشكل خام">خضار مشكل خام</option>
              </>
            )}
          </select>
          {errors?.rawProduct && (
            <p className="text-xs text-red-600">{errors.rawProduct[0]}</p>
          )}
        </div>

        {/* Finished Product */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">
            المنتج النهائي المصنع <span className="text-red-500">*</span>
          </Label>
          <select
            value={finishedProduct}
            onChange={(e) => onChange({ finishedProduct: e.target.value })}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#012d1d]"
          >
            <option value="">-- اختر المنتج التام --</option>
            {products.length > 0 ? (
              products.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.code})
                </option>
              ))
            ) : (
              <option value="فراولة مجمدة IQF">فراولة مجمدة IQF</option>
            )}
          </select>
          {errors?.finishedProduct && (
            <p className="text-xs text-red-600">{errors.finishedProduct[0]}</p>
          )}
        </div>

        {/* Operation Date */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-700">تاريخ التشغيل</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => onChange({ date: e.target.value })}
            className="w-full"
          />
          {errors?.date && (
            <p className="text-xs text-red-600">{errors.date[0]}</p>
          )}
        </div>
      </div>
    </div>
  );
}
