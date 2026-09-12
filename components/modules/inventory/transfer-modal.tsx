"use client";

import React, { useState, useMemo } from "react";
import { Station, FinishedGoodsBatch, RawBatch } from "@prisma/client";
import {
  ArrowRightLeft,
  AlertCircle,
  Truck,
  User,
  CheckCircle2,
  Box,
  Package,
  Layers,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createStockTransfer } from "@/actions/transfers";
import { TransferFormValues } from "@/lib/validations/transfer";

type ExtendedFgBatch = FinishedGoodsBatch & {
  station?: Station;
};

type ExtendedRawBatch = RawBatch & {
  station?: Station;
};

interface TransferModalProps {
  stations: Station[];
  batches?: ExtendedFgBatch[];
  fgBatches?: ExtendedFgBatch[];
  rawBatches?: ExtendedRawBatch[];
  stationSupplies?: any[];
  trigger?: React.ReactNode;
}

export function TransferModal({
  stations,
  batches = [],
  fgBatches = [],
  rawBatches = [],
  stationSupplies = [],
  trigger,
}: TransferModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const availableFgBatches = fgBatches.length > 0 ? fgBatches : batches;

  const initialFromStation = stations.length > 0 ? stations[0].id : "";
  const initialToStation = stations.length > 1 ? stations[1].id : "";

  const [formData, setFormData] = useState<TransferFormValues>({
    fromStationId: initialFromStation,
    toStationId: initialToStation,
    itemType: "FINISHED",
    batchId: "",
    rawBatchId: "",
    fgBatchId: "",
    supplyId: "",
    qtyKg: 0,
    truckPlate: "",
    driverName: "",
    date: new Date().toISOString().substring(0, 10),
    notes: "",
  });

  // Contextual items strictly filtered by the source station (fromStationId)
  const contextualFgBatches = useMemo(() => {
    if (!formData.fromStationId) return [];
    return availableFgBatches.filter(
      (b) => b.stationId === formData.fromStationId && Number(b.availableQty) > 0
    );
  }, [availableFgBatches, formData.fromStationId]);

  const contextualRawBatches = useMemo(() => {
    if (!formData.fromStationId) return [];
    return rawBatches.filter(
      (b) =>
        b.stationId === formData.fromStationId &&
        Number(b.availableQty) > 0 &&
        b.qcStatus === "APPROVED"
    );
  }, [rawBatches, formData.fromStationId]);

  const contextualStationSupplies = useMemo(() => {
    if (!formData.fromStationId) return [];
    return stationSupplies.filter(
      (s) => s.location?.stationId === formData.fromStationId && Number(s.stock) > 0
    );
  }, [stationSupplies, formData.fromStationId]);

  // Destination stations list: strictly excludes the current source station
  const destinationStations = useMemo(() => {
    return stations.filter((st) => st.id !== formData.fromStationId);
  }, [stations, formData.fromStationId]);

  // Calculate max available based on itemType within the source station context
  let maxAvailable = 0;
  if (formData.itemType === "FINISHED") {
    const selected = contextualFgBatches.find(
      (b) => b.fgBatchId === (formData.fgBatchId || formData.batchId)
    );
    maxAvailable = selected ? Number(selected.availableQty) : 0;
  } else if (formData.itemType === "RAW") {
    const selected = contextualRawBatches.find((b) => b.batchId === formData.rawBatchId);
    maxAvailable = selected ? Number(selected.availableQty) : 0;
  } else if (formData.itemType === "SUPPLIES") {
    const selected = contextualStationSupplies.find(
      (s) => s.supplyId === formData.supplyId && s.location?.stationId === formData.fromStationId
    );
    maxAvailable = selected ? Number(selected.stock) : 0;
  }

  const isQtyOver = formData.qtyKg > maxAvailable;

  // Cascading Handlers
  const handleFromStationChange = (newFromStationId: string) => {
    setFormData((prev) => {
      let nextToStationId = prev.toStationId;
      if (nextToStationId === newFromStationId) {
        const alt = stations.find((s) => s.id !== newFromStationId);
        nextToStationId = alt ? alt.id : "";
      }
      return {
        ...prev,
        fromStationId: newFromStationId,
        toStationId: nextToStationId,
        // Invalidate child item selections and quantity
        batchId: "",
        fgBatchId: "",
        rawBatchId: "",
        supplyId: "",
        qtyKg: 0,
      };
    });
  };

  const handleToStationChange = (newToStationId: string) => {
    if (newToStationId === formData.fromStationId) return;
    setFormData((prev) => ({ ...prev, toStationId: newToStationId }));
  };

  const handleItemTypeChange = (newItemType: "FINISHED" | "RAW" | "SUPPLIES") => {
    setFormData((prev) => ({
      ...prev,
      itemType: newItemType,
      batchId: "",
      fgBatchId: "",
      rawBatchId: "",
      supplyId: "",
      qtyKg: 0,
    }));
  };

  const handleFgSelect = (fgBatchId: string) => {
    setFormData((prev) => ({
      ...prev,
      fgBatchId,
      batchId: fgBatchId,
      qtyKg: 0,
    }));
  };

  const handleRawSelect = (rawBatchId: string) => {
    setFormData((prev) => ({
      ...prev,
      rawBatchId,
      batchId: rawBatchId,
      qtyKg: 0,
    }));
  };

  const handleSupplySelect = (supplyId: string) => {
    setFormData((prev) => ({
      ...prev,
      supplyId,
      qtyKg: 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrors({});

    if (!formData.fromStationId) {
      setErrorMessage("يرجى اختيار المحطة المصدر");
      return;
    }

    if (!formData.toStationId) {
      setErrorMessage("يرجى اختيار المحطة الوجهة");
      return;
    }

    if (formData.fromStationId === formData.toStationId) {
      setErrorMessage("لا يمكن التحويل لنفس المحطة المصدر والوجهة");
      return;
    }

    if (formData.itemType === "FINISHED" && !formData.fgBatchId && !formData.batchId) {
      setErrorMessage("يرجى اختيار الباتش التام المراد نقله");
      return;
    }

    if (formData.itemType === "RAW" && !formData.rawBatchId) {
      setErrorMessage("يرجى اختيار لوط الخام المراد نقله");
      return;
    }

    if (formData.itemType === "SUPPLIES" && !formData.supplyId) {
      setErrorMessage("يرجى اختيار المستلزم المراد نقله");
      return;
    }

    if (!formData.qtyKg || formData.qtyKg <= 0) {
      setErrorMessage("الكمية المنقولة يجب أن تكون أكبر من الصفر");
      return;
    }

    if (isQtyOver) {
      setErrorMessage(
        `الكمية المنقولة (${formData.qtyKg.toLocaleString()}) تتجاوز الرصيد المتاح بالمخزن المصدر (${maxAvailable.toLocaleString()})`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createStockTransfer(formData);
      if (res.success) {
        setOpen(false);
        setFormData({
          fromStationId: stations.length > 0 ? stations[0].id : "",
          toStationId: stations.length > 1 ? stations[1].id : "",
          itemType: "FINISHED",
          batchId: "",
          rawBatchId: "",
          fgBatchId: "",
          supplyId: "",
          qtyKg: 0,
          truckPlate: "",
          driverName: "",
          date: new Date().toISOString().substring(0, 10),
          notes: "",
        });
      } else {
        if (res.errors) {
          setErrors(res.errors);
        }
        setErrorMessage(res.error || "حدث خطأ أثناء تنفيذ التحويل");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ متوقع أثناء الاتصال بالخادم");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFromStationName = stations.find((s) => s.id === formData.fromStationId)?.name || "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 font-semibold text-xs shadow-sm">
            <ArrowRightLeft className="h-4 w-4" /> إنشاء إذن تحويل بين المخازن
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-white border border-gray-200 rounded-xl p-6 text-right">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-[#012d1d]" />
            <span>إذن تحويل بين المخازن والوحدات</span>
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            نقل رصيد (خامات / منتج تام / مستلزمات) بين المخازن المتماثلة في المحطات المختلفة مع إصدار رقم إذن نقل موثق.
          </p>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold flex items-center gap-2 mt-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* 1. Contextual Stations Grid: From Station -> To Station */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#012d1d]" />
                <span>المحطة المصدر</span> <span className="text-red-500">*</span>
              </Label>
              <select
                value={formData.fromStationId}
                onChange={(e) => handleFromStationChange(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-gray-300 bg-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
              >
                <option value="">-- اختر المحطة المصدر --</option>
                {stations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.id})
                  </option>
                ))}
              </select>
              {errors?.fromStationId && (
                <p className="text-[10px] text-red-600 font-semibold">{errors.fromStationId[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span>المحطة الوجهة (مختلفة)</span> <span className="text-red-500">*</span>
              </Label>
              <select
                value={formData.toStationId}
                onChange={(e) => handleToStationChange(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
              >
                <option value="">-- اختر المحطة الوجهة --</option>
                {destinationStations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.id})
                  </option>
                ))}
              </select>
              {errors?.toStationId && (
                <p className="text-[10px] text-red-600 font-semibold">{errors.toStationId[0]}</p>
              )}
            </div>
          </div>

          {/* 2. Warehouse Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">نوع المخزن والأصناف المنقولة</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleItemTypeChange("FINISHED")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold border transition-all ${
                  formData.itemType === "FINISHED"
                    ? "bg-emerald-700 text-white border-emerald-800 shadow-sm"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <Package className="h-3.5 w-3.5" /> منتج تام (FINISHED)
              </button>

              <button
                type="button"
                onClick={() => handleItemTypeChange("RAW")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold border transition-all ${
                  formData.itemType === "RAW"
                    ? "bg-amber-700 text-white border-amber-800 shadow-sm"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <Box className="h-3.5 w-3.5" /> خامات (RAW)
              </button>

              <button
                type="button"
                onClick={() => handleItemTypeChange("SUPPLIES")}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold border transition-all ${
                  formData.itemType === "SUPPLIES"
                    ? "bg-cyan-700 text-white border-cyan-800 shadow-sm"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> مستلزمات (SUPPLIES)
              </button>
            </div>
          </div>

          {/* 3. Contextual Item Selector based on itemType & Source Station */}
          {formData.itemType === "FINISHED" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">
                الباتش الجاهز المراد نقله من {selectedFromStationName || "المحطة المصدر"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              {contextualFgBatches.length > 0 ? (
                <select
                  value={formData.fgBatchId || formData.batchId || ""}
                  onChange={(e) => handleFgSelect(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                >
                  <option value="">-- اختر الباتش من مخزن المنتج التام بالمحطة --</option>
                  {contextualFgBatches.map((b) => (
                    <option key={b.fgBatchId} value={b.fgBatchId}>
                      {b.fgBatchId} — {b.productName} — متاح: {Number(b.availableQty).toLocaleString()} كجم
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  لا توجد باتشات منتج تام متاحة للتحويل بمخزن هذه المحطة.
                </div>
              )}
            </div>
          )}

          {formData.itemType === "RAW" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">
                لوط الخام المراد نقله من {selectedFromStationName || "المحطة المصدر"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              {contextualRawBatches.length > 0 ? (
                <select
                  value={formData.rawBatchId || ""}
                  onChange={(e) => handleRawSelect(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                >
                  <option value="">-- اختر اللوط من مخزن الخامات بالمحطة --</option>
                  {contextualRawBatches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchId} — {b.rawProduct} — متاح: {Number(b.availableQty).toLocaleString()} كجم
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  لا توجد لوطات خام معتمدة ومتاحة للتحويل بمخزن هذه المحطة.
                </div>
              )}
            </div>
          )}

          {formData.itemType === "SUPPLIES" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">
                المستلزم المراد نقله من {selectedFromStationName || "المحطة المصدر"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              {contextualStationSupplies.length > 0 ? (
                <select
                  value={formData.supplyId || ""}
                  onChange={(e) => handleSupplySelect(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#012d1d]"
                >
                  <option value="">-- اختر المستلزم من مخزن المستلزمات بالمحطة --</option>
                  {contextualStationSupplies.map((s) => (
                    <option key={`${s.locationId}-${s.supplyId}`} value={s.supplyId}>
                      {s.supply?.name} — متاح بالمحطة: {Number(s.stock).toLocaleString()} {s.supply?.unit || "وحدة"}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  لا توجد مستلزمات تعبئة متاحة للتحويل بمخزن هذه المحطة.
                </div>
              )}
            </div>
          )}

          {/* 4. Quantity Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-gray-700">
                الكمية المنقولة <span className="text-red-500">*</span>
              </Label>
              {maxAvailable > 0 && (
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span>
                    المتاح بمخزن المحطة: <strong className="text-gray-900 font-mono">{maxAvailable.toLocaleString()}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, qtyKg: maxAvailable }))}
                    className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold underline"
                  >
                    سحب الكل
                  </button>
                </div>
              )}
            </div>
            <Input
              type="number"
              min={0}
              max={maxAvailable}
              step="any"
              value={formData.qtyKg || ""}
              onChange={(e) => setFormData((p) => ({ ...p, qtyKg: Number(e.target.value) }))}
              className={`h-9 font-mono text-xs font-bold ${
                isQtyOver ? "border-red-500 bg-red-50 text-red-700" : ""
              }`}
              placeholder="0"
            />
            {isQtyOver && (
              <p className="text-[11px] text-red-600 font-semibold">
                الكمية تتجاوز الرصيد المتاح بالمخزن المصدر ({maxAvailable.toLocaleString()})
              </p>
            )}
          </div>

          {/* 5. Logistics: Truck Plate & Driver Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-gray-500" />
                <span>لوحة سيارة النقل</span> <span className="text-[11px] text-gray-400 font-normal">(اختياري)</span>
              </Label>
              <Input
                type="text"
                value={formData.truckPlate}
                onChange={(e) => setFormData((p) => ({ ...p, truckPlate: e.target.value }))}
                placeholder="أ ب ج 1234"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-gray-500" />
                <span>اسم السائق</span> <span className="text-[11px] text-gray-400 font-normal">(اختياري)</span>
              </Label>
              <Input
                type="text"
                value={formData.driverName}
                onChange={(e) => setFormData((p) => ({ ...p, driverName: e.target.value }))}
                placeholder="اسم السائق الثلاثي"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* 6. Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <span>تاريخ التحويل</span>
              </Label>
              <Input
                type="date"
                value={formData.date || ""}
                onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">ملاحظات التحويل</Label>
              <Input
                type="text"
                value={formData.notes || ""}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="ملاحظات الشحن والسيارة..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-xs h-9 font-semibold"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isQtyOver || !formData.fromStationId || !formData.toStationId}
              className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 font-semibold text-xs h-9 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "جاري تنفيذ التحويل..." : "اعتماد إذن النقل"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
