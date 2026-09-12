"use client";

import React from "react";
import { FinishedGoodsBatch, Station, ClientOrder } from "@prisma/client";
import { Package, Wand2, CheckCircle2, AlertTriangle, GitFork } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ExtendedFinishedGoodsBatch = FinishedGoodsBatch & {
  station: Station;
};

export interface AllocatedBatchItem {
  fgBatchId: string;
  qty: number;
  availableQty: number;
  costPerKg: number;
}

interface Step2BatchAllocationProps {
  selectedOrder?: ClientOrder | null;
  availableBatches: ExtendedFinishedGoodsBatch[];
  allocatedBatches: AllocatedBatchItem[];
  onChange: (allocatedBatches: AllocatedBatchItem[]) => void;
  errors?: Record<string, string[]>;
}

export function Step2BatchAllocation({
  selectedOrder,
  availableBatches,
  allocatedBatches,
  onChange,
  errors = {},
}: Step2BatchAllocationProps) {
  // Filter batches matching order product name
  const filteredBatches = selectedOrder
    ? availableBatches.filter(
        (b) =>
          b.productName.trim().toLowerCase() ===
            selectedOrder.productName.trim().toLowerCase() &&
          Number(b.availableQty) > 0
      )
    : availableBatches.filter((b) => Number(b.availableQty) > 0);

  // Reactive cleanup: purge any batch from allocatedBatches that is not in filteredBatches
  React.useEffect(() => {
    if (!selectedOrder) return;
    const validBatchIds = new Set(filteredBatches.map((b) => b.fgBatchId));
    const validAllocations = allocatedBatches.filter((item) => validBatchIds.has(item.fgBatchId));
    if (validAllocations.length !== allocatedBatches.length) {
      onChange(validAllocations);
    }
  }, [filteredBatches, allocatedBatches, selectedOrder, onChange]);

  const unfulfilledQtyKg = selectedOrder ? Number(selectedOrder.unfulfilledQtyKg) : 0;

  // Calculate total allocated weight
  const totalAllocatedKg = allocatedBatches.reduce((acc, item) => acc + (item.qty || 0), 0);

  // Check if any batch allocation exceeds available batch balance
  const hasExceededBatchLimit = allocatedBatches.some(
    (item) => item.qty > item.availableQty
  );

  // Check if total allocated weight exceeds order unfulfilled balance
  const hasExceededOrderLimit = selectedOrder
    ? totalAllocatedKg > unfulfilledQtyKg
    : false;

  const handleQtyChange = (batch: ExtendedFinishedGoodsBatch, newQty: number) => {
    const existingIndex = allocatedBatches.findIndex((b) => b.fgBatchId === batch.fgBatchId);
    let updated = [...allocatedBatches];

    if (existingIndex >= 0) {
      if (newQty <= 0) {
        updated.splice(existingIndex, 1);
      } else {
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: newQty,
        };
      }
    } else if (newQty > 0) {
      updated.push({
        fgBatchId: batch.fgBatchId,
        qty: newQty,
        availableQty: Number(batch.availableQty),
        costPerKg: Number(batch.costPerKg),
      });
    }

    onChange(updated);
  };

  const handleAutoAllocate = () => {
    if (!selectedOrder || filteredBatches.length === 0) return;

    let remainingNeeded = unfulfilledQtyKg;
    const newAllocations: AllocatedBatchItem[] = [];

    for (const batch of filteredBatches) {
      if (remainingNeeded <= 0) break;

      const avail = Number(batch.availableQty);
      const alloc = Math.min(remainingNeeded, avail);

      if (alloc > 0) {
        newAllocations.push({
          fgBatchId: batch.fgBatchId,
          qty: alloc,
          availableQty: avail,
          costPerKg: Number(batch.costPerKg),
        });
        remainingNeeded -= alloc;
      }
    }

    onChange(newAllocations);
  };

  // Supplier Traceability calculation
  const activeSuppliersMap: Record<string, number> = {};
  allocatedBatches.forEach((item) => {
    if (item.qty <= 0) return;
    const fgObj = availableBatches.find((b) => b.fgBatchId === item.fgBatchId);
    if (fgObj && fgObj.suppliersSummary && Array.isArray(fgObj.suppliersSummary)) {
      (fgObj.suppliersSummary as any[]).forEach((s) => {
        const sName = s.supplierName || "مورد غير معروف";
        const sharePct = s.sharePct || 100;
        activeSuppliersMap[sName] =
          (activeSuppliersMap[sName] || 0) + item.qty * (sharePct / 100);
      });
    }
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="font-bold text-base text-[#012d1d] flex items-center gap-2">
            <Package className="h-5 w-5 text-[#012d1d]" />
            <span>2. تخصيص الباتشات من المخزن (Batch Allocation)</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            سحب الباتشات المتاحة بالمخزن المطابقة لمنتج الطلبية ({selectedOrder?.productName || "كل المنتجات"})
          </p>
        </div>

        <Button
          type="button"
          onClick={handleAutoAllocate}
          disabled={!selectedOrder || filteredBatches.length === 0}
          variant="outline"
          className="gap-2 text-xs font-bold text-[#012d1d] border-[#012d1d]/30 hover:bg-emerald-50"
        >
          <Wand2 className="h-4 w-4 text-emerald-600" />
          تخصيص تلقائي ذكي (FIFO)
        </Button>
      </div>

      {/* Available Batches Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50 font-bold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="p-3">رقم الـ Batch</th>
                <th className="p-3">مصدر الباتش</th>
                <th className="p-3">المحطة / المخزن</th>
                <th className="p-3 font-mono text-emerald-800">الرصيد المتاح</th>
                <th className="p-3 font-mono">تكلفة الإنتاج/كجم</th>
                <th className="p-3 font-mono w-40">المخصص للشحن (كجم)</th>
                <th className="p-3 font-mono">إجمالي التكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {filteredBatches.length > 0 ? (
                filteredBatches.map((batch) => {
                  const allocItem = allocatedBatches.find((b) => b.fgBatchId === batch.fgBatchId);
                  const currentQty = allocItem ? allocItem.qty : 0;
                  const maxAvail = Number(batch.availableQty);
                  const costPerKg = Number(batch.costPerKg);
                  const lineTotalCost = currentQty * costPerKg;
                  const isExceeded = currentQty > maxAvail;

                  return (
                    <tr key={batch.fgBatchId} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3 font-bold text-[#012d1d]">{batch.fgBatchId}</td>
                      <td className="p-3">
                        {batch.sourceType === "DIRECT_PURCHASE" ? (
                          <span className="bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded text-[11px] font-sans font-semibold">
                            🚢 صفقة مباشرة
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-sans font-semibold">
                            🏭 تشغيل: {batch.sourceOpId || "إنتاج"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-sans text-gray-700">{batch.station?.name || "محطة رئيسية"}</td>
                      <td className="p-3 font-bold text-emerald-700">
                        {maxAvail.toLocaleString()} كجم
                      </td>
                      <td className="p-3">{costPerKg.toFixed(2)} ج.م</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={maxAvail}
                          value={currentQty || ""}
                          onChange={(e) =>
                            handleQtyChange(batch, parseFloat(e.target.value) || 0)
                          }
                          className={`w-32 text-xs font-bold font-mono ${
                            isExceeded
                              ? "border-red-500 bg-red-50 text-red-900"
                              : "border-gray-300"
                          }`}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3 font-bold text-[#012d1d]">
                        {Math.round(lineTotalCost).toLocaleString()} ج.م
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500 font-sans">
                    لا توجد باتشات تامة متوفرة بمخزن الجاهز تطابق المنتج ({selectedOrder?.productName || "المحدد"}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Traceability Breakdown Box */}
      {Object.keys(activeSuppliersMap).length > 0 && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
          <span className="font-bold text-[#012d1d] flex items-center gap-1.5 text-xs font-sans">
            <GitFork className="h-4 w-4 text-blue-600" />
            شجرة أصل الموردين للكميات المخصصة (Raw Supplier Traceability):
          </span>
          <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
            {Object.entries(activeSuppliersMap).map(([sName, sQty]) => {
              const sharePct = ((sQty / totalAllocatedKg) * 100).toFixed(1);
              return (
                <span
                  key={sName}
                  className="bg-white text-[#012d1d] border border-gray-300 px-3 py-1 rounded-lg font-sans font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <span>🌱 {sName}:</span>
                  <strong className="font-mono text-blue-700">{sharePct}%</strong>
                  <span className="text-xs text-gray-500 font-mono">
                    ({Math.round(sQty).toLocaleString()} كجم)
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Batch Allocation Live Summary & Validation Alert */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-bold font-mono ${
          hasExceededBatchLimit || hasExceededOrderLimit
            ? "bg-red-50 border-red-300 text-red-900"
            : totalAllocatedKg > 0 && totalAllocatedKg <= unfulfilledQtyKg
            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
            : "bg-amber-50 border-amber-300 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-2">
          {hasExceededBatchLimit || hasExceededOrderLimit ? (
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          )}
          <span>
            رصيد الطلبية: <strong className="text-sm">{unfulfilledQtyKg.toLocaleString()}</strong> كجم | 
            المخصص من المخزن: <strong className="text-sm">{totalAllocatedKg.toLocaleString()}</strong> كجم
          </span>
        </div>

        <div className="font-sans font-bold">
          {hasExceededBatchLimit ? (
            "⚠️ خطأ: كمية مخصصة تتجاوز الرصيد المتاح بالباتش!"
          ) : hasExceededOrderLimit ? (
            `⚠️ خطأ: إجمالي الكمية المخصصة (${totalAllocatedKg.toLocaleString()} كجم) تتجاوز رصيد الطلبية المتبقي (${unfulfilledQtyKg.toLocaleString()} كجم)!`
          ) : totalAllocatedKg === 0 ? (
            "يرجى تخصيص كمية باتش واحد على الأقل للمتابعة"
          ) : (
            "✓ تخصيص الكمية سليم ومطابق لرصيد الطلبية والمخزن"
          )}
        </div>
      </div>

      {errors.allocatedBatches && (
        <p className="text-xs text-red-600 font-semibold">{errors.allocatedBatches[0]}</p>
      )}
    </div>
  );
}
