"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  GitBranch,
  Search,
  Building2,
  Box,
  Package,
  Truck,
  User,
  Layers,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLotTraceability } from "@/actions/stations";

interface StationTraceabilityTabProps {
  initialLotId?: string | null;
  rawBatches: Array<{ batchId: string; rawProduct: string }>;
  finishedBatches: Array<{ fgBatchId: string; productName: string }>;
}

export function StationTraceabilityTab({
  initialLotId,
  rawBatches,
  finishedBatches,
}: StationTraceabilityTabProps) {
  const [lotQuery, setLotQuery] = useState(initialLotId || "");
  const [isPending, startTransition] = useTransition();
  const [traceData, setTraceData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = (idToSearch?: string) => {
    const q = (idToSearch || lotQuery).trim();
    if (!q) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await getLotTraceability(q);
      if (res.success) {
        setTraceData(res);
      } else {
        setTraceData(null);
        setErrorMsg(res.error || "تعذر استخراج بيانات التتبع لهذا اللوط");
      }
    });
  };

  useEffect(() => {
    if (initialLotId) {
      setLotQuery(initialLotId);
      handleSearch(initialLotId);
    }
  }, [initialLotId]);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-700" />
            <span>نظام التتبع المزدوج للوطات والإنتاج (Bidirectional Lot Traceability)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            تتبع شجرة النسب الكاملة للأمام (Forward: من المورد للتصدير) أو للخلف (Backward: من الشحنة للمزرعة).
          </p>
        </div>

        {/* Quick Lot Selector & Search Input */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={lotQuery}
            onChange={(e) => {
              setLotQuery(e.target.value);
              if (e.target.value) handleSearch(e.target.value);
            }}
            className="h-9 px-3 text-xs rounded-lg border border-gray-300 bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            <option value="">-- اختر لوط من المحطة الحالية --</option>
            <optgroup label="لوطات الخامات المتاحة">
              {rawBatches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} ({b.rawProduct})
                </option>
              ))}
            </optgroup>
            <optgroup label="باتشات المنتج التام">
              {finishedBatches.map((fb) => (
                <option key={fb.fgBatchId} value={fb.fgBatchId}>
                  {fb.fgBatchId} ({fb.productName})
                </option>
              ))}
            </optgroup>
          </select>

          <div className="flex items-center gap-1.5">
            <Input
              type="text"
              placeholder="أو أدخل رقم أي لوط..."
              value={lotQuery}
              onChange={(e) => setLotQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 w-44 text-xs font-mono"
            />
            <Button
              type="button"
              onClick={() => handleSearch()}
              disabled={isPending || !lotQuery.trim()}
              className="h-9 bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold px-3 gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              {isPending ? "جاري التتبع..." : "تتبع"}
            </Button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* When no query searched yet */}
      {!traceData && !errorMsg && (
        <div className="p-12 text-center text-gray-400 space-y-3 border-2 border-dashed border-gray-200 rounded-xl">
          <GitBranch className="w-12 h-12 text-indigo-400 mx-auto" />
          <h3 className="text-sm font-bold text-gray-700">مركز تتبع الأنساب واللوطات</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            اختر لوط خام أو باتش تام من القائمة المنسدلة بالأعلى، أو أدخل رقم أي لوط للاطلاع على دورة حياته المغلقة بالكامل من المنشأ حتى الشحن.
          </p>
        </div>
      )}

      {/* TRACEABILITY VISUALIZATION TREE */}
      {traceData && (
        <div className="space-y-6">
          {/* Main Lot Summary Card */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold">
                {traceData.lotType === "RAW" ? <Box className="w-5 h-5" /> : <Package className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-gray-900 font-mono">{traceData.lotId}</h3>
                  <Badge className={traceData.lotType === "RAW" ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-emerald-100 text-emerald-900 border-emerald-300"}>
                    {traceData.lotType === "RAW" ? "لوط خام زراعي (Raw Batch)" : "باتش منتج تام مصنع (FG Batch)"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 font-sans mt-0.5">
                  الصنف: <strong className="text-gray-900">{traceData.productName}</strong> • الموقع الحالي:{" "}
                  <strong className="text-indigo-900">{traceData.currentStatus.stationName}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono bg-white p-3 rounded-lg border border-indigo-100">
              <div>
                <span className="text-gray-500 block font-sans text-[10px]">الرصيد المتاح:</span>
                <strong className="text-sm text-[#012d1d]">{traceData.currentStatus.availableQty.toLocaleString()} كجم</strong>
              </div>
              <div>
                <span className="text-gray-500 block font-sans text-[10px]">الكمية الأصلية:</span>
                <strong className="text-sm text-gray-700">{traceData.currentStatus.initialQty.toLocaleString()} كجم</strong>
              </div>
              <div>
                <span className="text-gray-500 block font-sans text-[10px]">الحالة والجودة:</span>
                <strong className="text-sm text-emerald-800 font-sans">{traceData.currentStatus.qcStatus || traceData.currentStatus.qualityStatus}</strong>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SCENARIO A: RAW BATCH FORWARD TRACEABILITY TREE */}
          {/* ======================================================== */}
          {traceData.lotType === "RAW" && (
            <div className="space-y-6">
              {/* STEP 1: SUPPLIER & ORIGIN */}
              <div className="relative pl-6 border-r-2 border-indigo-300 mr-4 space-y-2">
                <div className="absolute -right-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white" />
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-700" />
                      المرحلة 1: المورد والمنشأ (Supplier Origin & Receiving)
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {new Date(traceData.currentStatus.receivedDate).toLocaleDateString("ar-EG")}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
                    <div>
                      <span className="text-gray-500 block font-sans text-[11px]">اسم المورد:</span>
                      <strong className="font-sans text-gray-900">{traceData.supplier.name}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-sans text-[11px]">كود المورد:</span>
                      <strong className="text-indigo-900">{traceData.supplier.code}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-sans text-[11px]">رقم سيارة النقل:</span>
                      <strong>{traceData.receiptInfo.truckPlate || "غير مسجل"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-sans text-[11px]">درجة البركس (Brix):</span>
                      <strong>{traceData.receiptInfo.brixDegree ? `${traceData.receiptInfo.brixDegree}°` : "—"}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2: TRANSFERS IF ANY */}
              {traceData.transfers && traceData.transfers.length > 0 && (
                <div className="relative pl-6 border-r-2 border-indigo-300 mr-4 space-y-2">
                  <div className="absolute -right-[9px] top-0 w-4 h-4 rounded-full bg-amber-500 border-2 border-white" />
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-700" />
                      المرحلة 2: التحويلات بين المحطات ({traceData.transfers.length} تحويلات)
                    </span>
                    {traceData.transfers.map((t: any) => (
                      <div key={t.transferId} className="p-2 bg-white rounded border border-amber-200 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span>تحويل رقم: <strong>{t.transferId}</strong></span> • من: <strong>{t.fromStation}</strong> &larr; إلى: <strong>{t.toStation}</strong>
                        </div>
                        <strong className="text-amber-900">{t.qtyKg.toLocaleString()} كجم</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: PROCESSING / ROTATION OPERATIONS */}
              <div className="relative pl-6 border-r-2 border-indigo-300 mr-4 space-y-3">
                <div className="absolute -right-[9px] top-0 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white" />
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    المرحلة 3: عمليات التشغيل والتدوير التي استهلكت هذا اللوط ({traceData.downstreamOperations.length} عمليات)
                  </span>

                  {traceData.downstreamOperations.length === 0 ? (
                    <p className="text-xs text-gray-500 font-sans py-2">
                      اللوط ما زال بالمخزن ولم يتم سحبه في أي عملية تشغيل حتى الآن.
                    </p>
                  ) : (
                    traceData.downstreamOperations.map((op: any) => (
                      <div key={op.operationId} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900 text-xs">عملية تشغيل: {op.operationId}</span>
                            <Badge variant="outline" className="bg-white text-emerald-900 text-[10px] font-sans">
                              مقاول: {op.contractorName}
                            </Badge>
                          </div>
                          <span className="text-[11px] font-mono text-gray-500">
                            {new Date(op.date).toLocaleDateString("ar-EG")}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-white p-2.5 rounded border border-gray-200">
                          <div>
                            <span className="text-gray-500 block font-sans text-[10px]">المسحوب من هذا اللوط:</span>
                            <strong className="text-indigo-900">{op.withdrawnFromThisLot.toLocaleString()} كجم</strong>
                          </div>
                          <div>
                            <span className="text-gray-500 block font-sans text-[10px]">إجمالي ناتج التشغيلة:</span>
                            <strong className="text-emerald-900">{op.finishedOutputKg.toLocaleString()} كجم</strong>
                          </div>
                          <div>
                            <span className="text-gray-500 block font-sans text-[10px]">الهالك الكلي:</span>
                            <strong className="text-rose-700">{op.rawWasteKg.toLocaleString()} كجم</strong>
                          </div>
                          <div>
                            <span className="text-gray-500 block font-sans text-[10px]">نسبة التصافي:</span>
                            <strong className="text-emerald-700">{op.yieldPercent}%</strong>
                          </div>
                        </div>

                        {/* Resulting Batches & Export Shipments */}
                        {op.resultingBatches.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <span className="text-[11px] font-bold text-gray-700 font-sans block">
                              المنتج التام المتولد وشحنات التصدير المرتبطة:
                            </span>
                            {op.resultingBatches.map((gb: any) => (
                              <div key={gb.fgBatchId} className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2">
                                <div className="flex items-center justify-between text-xs font-mono">
                                  <div className="flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5 text-emerald-700" />
                                    <strong className="text-emerald-950 font-sans">{gb.productName}</strong>
                                    <span className="text-gray-600 font-bold">({gb.fgBatchId})</span>
                                  </div>
                                  <span className="text-emerald-900 font-bold">
                                    المتاح: {gb.availableQty.toLocaleString()} كجم
                                  </span>
                                </div>

                                {/* Shipments for this batch */}
                                {gb.shipments.length > 0 ? (
                                  <div className="space-y-1">
                                    {gb.shipments.map((sh: any) => (
                                      <div key={sh.shipmentId} className="p-2 bg-white rounded border border-emerald-200 text-xs font-mono flex items-center justify-between">
                                        <div>
                                          <Truck className="w-3.5 h-3.5 inline ml-1 text-blue-600" />
                                          شحنة: <strong>{sh.shipmentId}</strong> &larr; العميل:{" "}
                                          <strong className="font-sans text-gray-900">{sh.customerName}</strong>
                                        </div>
                                        <Badge className="bg-blue-50 text-blue-900 border-blue-200">
                                          {sh.shippedQtyKg.toLocaleString()} كجم
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-500 font-sans block">
                                    لم يتم شحن هذا الباتش بعد (متاح بالمخزن).
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCENARIO B: FINISHED GOODS BACKWARD TRACEABILITY TREE */}
          {/* ======================================================== */}
          {traceData.lotType === "FINISHED" && (
            <div className="space-y-6">
              {/* STAGE 1: FINISHED GOOD METRICS */}
              <div className="relative pl-6 border-r-2 border-emerald-400 mr-4 space-y-2">
                <div className="absolute -right-[9px] top-0 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white" />
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 font-sans">
                    <Package className="w-4 h-4 text-emerald-600" />
                    المرحلة 1: بيانات المنتج التام المصنع بالمحطة
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
                    <div>
                      <span className="text-gray-500 block font-sans text-[11px]">اسم المنتج:</span>
                      <strong className="font-sans text-gray-900">{traceData.productName}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-sans text-[11px]">تاريخ الإنتاج:</span>
                      <strong>{new Date(traceData.currentStatus.productionDate).toLocaleDateString("ar-EG")}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-sans text-[11px]">تكلفة الكيلو الموزونة:</span>
                      <strong className="text-emerald-900">{traceData.currentStatus.costPerKg.toFixed(2)} ج.م/كجم</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-sans text-[11px]">حالة الصلاحية:</span>
                      <strong className="font-sans text-emerald-800">{traceData.currentStatus.qualityStatus}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* STAGE 2: UPSTREAM PROCESSING OPERATION (WHERE IT CAME FROM) */}
              {traceData.upstreamOperation ? (
                <div className="relative pl-6 border-r-2 border-emerald-400 mr-4 space-y-3">
                  <div className="absolute -right-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white" />
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 font-sans">
                        <Layers className="w-4 h-4 text-indigo-700" />
                        المرحلة 2: عملية التشغيل الأصلية ({traceData.upstreamOperation.operationId})
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        تاريخ التشغيل: {new Date(traceData.upstreamOperation.date).toLocaleDateString("ar-EG")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-white p-3 rounded-lg border border-indigo-100">
                      <div>
                        <span className="text-gray-500 block font-sans text-[10px]">المقاول المنفذ:</span>
                        <strong className="font-sans text-gray-900">{traceData.upstreamOperation.contractorName}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block font-sans text-[10px]">إجمالي الخام الداخل:</span>
                        <strong>{traceData.upstreamOperation.rawInputKg.toLocaleString()} كجم</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block font-sans text-[10px]">الناتج التام:</span>
                        <strong className="text-emerald-900">{traceData.upstreamOperation.finishedOutputKg.toLocaleString()} كجم</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block font-sans text-[10px]">نسبة التصافي / الهالك:</span>
                        <strong>{traceData.upstreamOperation.yieldPercent}% تصافي</strong>
                      </div>
                    </div>

                    {/* Input Raw Lots DNA (The Real Agricultural Origins) */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-indigo-950 font-sans block">
                        اللوطات الخام والمزارع التي دخلت في تصنيع هذا الباتش:
                      </span>
                      <div className="space-y-1.5">
                        {traceData.upstreamOperation.inputRawBatches.map((rb: any) => (
                          <div key={rb.batchId} className="p-2.5 bg-white rounded-lg border border-indigo-200 text-xs font-mono flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Box className="w-4 h-4 text-amber-600" />
                              <strong className="text-gray-900 font-bold">{rb.batchId}</strong>
                              <span className="text-gray-600 font-sans">({rb.rawProduct})</span>
                              <Badge variant="outline" className="text-[10px] font-sans">
                                المورد: {rb.supplierName || "مورد معتمد"}
                              </Badge>
                            </div>
                            <strong className="text-indigo-950">{rb.qtyKg.toLocaleString()} كجم</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
                  تم توريد هذا الباتش كشراء بضاعة جاهزة مباشرة (Direct Purchase Deal) وليس عبر عملية تصنيع محلية.
                </div>
              )}

              {/* STAGE 3: EXPORT SHIPMENTS TO CUSTOMERS */}
              <div className="relative pl-6 border-r-2 border-emerald-400 mr-4 space-y-2">
                <div className="absolute -right-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-2 border-white" />
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5 font-sans">
                    <Truck className="w-4 h-4 text-blue-700" />
                    المرحلة 3: شحنات التصدير والعملاء النهائيين ({traceData.shipments.length} شحنات)
                  </span>

                  {traceData.shipments.length === 0 ? (
                    <p className="text-xs text-gray-500 font-sans py-2">
                      الباتش بالكامل متاح بمخزن المنتج التام ولم يتم تخصيصه أو شحنه لأي عميل حتى الآن.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {traceData.shipments.map((sh: any) => (
                        <div key={sh.shipmentId} className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-950">شحنة تصدير: {sh.shipmentId}</span>
                              <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-sans">
                                {sh.status}
                              </Badge>
                            </div>
                            <span>{sh.dispatchDate ? new Date(sh.dispatchDate).toLocaleDateString("ar-EG") : "قيد التجهيز"}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-white p-2 rounded border border-blue-100">
                            <div>
                              <span className="text-gray-500 block font-sans">العميل المستورد:</span>
                              <strong className="font-sans text-gray-900">{sh.customerName}</strong>
                            </div>
                            <div>
                              <span className="text-gray-500 block font-sans">رقم الحاوية:</span>
                              <strong>{sh.containerNo || "—"}</strong>
                            </div>
                            <div>
                              <span className="text-gray-500 block font-sans">الكمية المشحونة:</span>
                              <strong className="text-blue-900">{sh.shippedQtyKg.toLocaleString()} كجم</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
