"use client";

import React from "react";
import { ClientOrder } from "@prisma/client";
import { Truck, Calculator, DollarSign, FileText, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AllocatedBatchItem } from "./step-2-batch-allocation";
import { formatCurrency } from "@/lib/currency";

interface Step3LogisticsCostsProps {
  selectedOrder?: ClientOrder | null;
  allocatedBatches: AllocatedBatchItem[];
  containerNo: string;
  sealNo: string;
  shippingLine: string;
  bookingNo: string;
  costs: {
    inlandTrucking: number;
    oceanFreight: number;
    customsClearance: number;
    inspectionCertificates: number;
    portTerminalCharges: number;
  };
  notes?: string;
  onChange: (fields: any) => void;
  errors?: Record<string, string[]>;
}

export function Step3LogisticsCosts({
  selectedOrder,
  allocatedBatches,
  containerNo,
  sealNo,
  shippingLine,
  bookingNo,
  costs,
  notes,
  onChange,
  errors = {},
}: Step3LogisticsCostsProps) {
  // Calculations
  const totalAllocatedKg = allocatedBatches.reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalBatchCost = allocatedBatches.reduce((sum, item) => sum + (item.qty * item.costPerKg), 0);

  const unitPriceEgp = selectedOrder ? Number(selectedOrder.unitPriceEur) : 0;
  const totalRevenueEgp = totalAllocatedKg * unitPriceEgp;

  const totalLogisticsCost =
    (Number(costs.inlandTrucking) || 0) +
    (Number(costs.oceanFreight) || 0) +
    (Number(costs.customsClearance) || 0) +
    (Number(costs.inspectionCertificates) || 0) +
    (Number(costs.portTerminalCharges) || 0);

  const grandTotalCost = totalBatchCost + totalLogisticsCost;
  const netProfitEgp = totalRevenueEgp - grandTotalCost;
  const profitMarginPct = totalRevenueEgp > 0 ? (netProfitEgp / totalRevenueEgp) * 100 : 0;
  const profitPerKg = totalAllocatedKg > 0 ? netProfitEgp / totalAllocatedKg : 0;

  const handleCostChange = (field: string, value: number) => {
    onChange({
      costs: {
        ...costs,
        [field]: value,
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Logistics inputs */}
      <div className="lg:col-span-7 space-y-6">
        {/* Shipping & Container Info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-base text-[#012d1d] flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#012d1d]" />
              <span>3. بيانات الحاوية والشحن البحري</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-gray-800 text-xs">رقم الحاوية المبردة (Container No) *</Label>
              <Input
                type="text"
                value={containerNo}
                onChange={(e) => onChange({ containerNo: e.target.value })}
                placeholder="مثال: MSKU-987654-2"
                className="font-mono text-xs"
              />
              {errors.containerNo && (
                <p className="text-xs text-red-600 font-semibold">{errors.containerNo[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-gray-800 text-xs">رقم الختم الملاحي (Seal No) *</Label>
              <Input
                type="text"
                value={sealNo}
                onChange={(e) => onChange({ sealNo: e.target.value })}
                placeholder="مثال: EG-CUS-88210"
                className="font-mono text-xs"
              />
              {errors.sealNo && (
                <p className="text-xs text-red-600 font-semibold">{errors.sealNo[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-gray-800 text-xs">الخط الملاحي (Shipping Line) *</Label>
              <Input
                type="text"
                value={shippingLine}
                onChange={(e) => onChange({ shippingLine: e.target.value })}
                placeholder="مثال: Maersk Line / MSC"
                className="text-xs font-semibold"
              />
              {errors.shippingLine && (
                <p className="text-xs text-red-600 font-semibold">{errors.shippingLine[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-gray-800 text-xs">رقم الحجز الملاحي (Booking No) *</Label>
              <Input
                type="text"
                value={bookingNo}
                onChange={(e) => onChange({ bookingNo: e.target.value })}
                placeholder="مثال: BKG-99201"
                className="font-mono text-xs"
              />
              {errors.bookingNo && (
                <p className="text-xs text-red-600 font-semibold">{errors.bookingNo[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Logistics & Export Costs Breakdown */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="font-bold text-base text-[#012d1d] flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#012d1d]" />
              <span>مصروفات الشحن والتصدير (بالجنيه)</span>
            </h3>
            <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              إجمالي اللوجستيات: {formatCurrency(totalLogisticsCost)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-gray-700 text-xs">نولون النقل البري للميناء (Inland Trucking)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costs.inlandTrucking || 0}
                onChange={(e) => handleCostChange("inlandTrucking", parseFloat(e.target.value) || 0)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-gray-700 text-xs">النولون البحري (Ocean Freight)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costs.oceanFreight || 0}
                onChange={(e) => handleCostChange("oceanFreight", parseFloat(e.target.value) || 0)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-gray-700 text-xs">التخليص الجمركي والتثمين (Customs Clearance)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costs.customsClearance || 0}
                onChange={(e) => handleCostChange("customsClearance", parseFloat(e.target.value) || 0)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-gray-700 text-xs">شهادات الفحص وسحب العينات (Inspection & Phyto)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costs.inspectionCertificates || 0}
                onChange={(e) => handleCostChange("inspectionCertificates", parseFloat(e.target.value) || 0)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="font-bold text-gray-700 text-xs">رسوم الميناء والتفريغ (Terminal Port Charges)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costs.portTerminalCharges || 0}
                onChange={(e) => handleCostChange("portTerminalCharges", parseFloat(e.target.value) || 0)}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-2">
          <Label className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-gray-600" /> ملاحظات وشروط خاصة بالشحنة
          </Label>
          <textarea
            value={notes || ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="أدخل أي ملاحظات إضافية بخصوص بوليصة الشحن أو التخليص..."
            rows={2}
            className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#012d1d] outline-none"
          />
        </div>
      </div>

      {/* RIGHT COLUMN: Live Profit & Margin Preview Card */}
      <div className="lg:col-span-5 sticky top-[80px]">
        <div className="bg-[#012d1d] text-white rounded-2xl p-6 shadow-xl border border-emerald-900 space-y-6">
          <div className="border-b border-white/20 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-base flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <span>معاينة أرباح الشحنة (Live Margin)</span>
            </h3>
            <span className="text-[11px] bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 px-2.5 py-0.5 rounded font-bold font-mono">
              حساب لحظي
            </span>
          </div>

          {/* Detailed Financial Breakdown */}
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between items-center text-white/80">
              <span className="font-sans">إجمالي وزن الشحنة:</span>
              <strong className="text-sm font-bold text-white">{totalAllocatedKg.toLocaleString()} كجم</strong>
            </div>

            <div className="flex justify-between items-center text-white/80">
              <span className="font-sans">إجمالي المبيعات الإرادية:</span>
              <strong className="text-sm font-bold text-emerald-300">
                {formatCurrency(totalRevenueEgp)}
              </strong>
            </div>

            <div className="flex justify-between items-center text-white/70">
              <span className="font-sans">تكلفة تصنيع اللوطات المخصصة:</span>
              <strong className="text-white font-bold">{formatCurrency(totalBatchCost)}</strong>
            </div>

            <div className="flex justify-between items-center text-white/70">
              <span className="font-sans">المصروفات اللوجستية والنولون:</span>
              <strong className="text-white font-bold">{formatCurrency(totalLogisticsCost)}</strong>
            </div>

            <div className="pt-3 border-t border-white/20 flex justify-between items-center text-xs font-bold text-white">
              <span className="font-sans">إجمالي تكلفة الشحنة الكلية:</span>
              <strong className="text-sm text-red-300">{formatCurrency(grandTotalCost)}</strong>
            </div>
          </div>

          {/* Net Profit & Profit Margin Highlight Box */}
          <div className="bg-white/10 p-5 rounded-xl space-y-3 border border-white/15 backdrop-blur-xs">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-emerald-300 block font-sans">صافي ربح الشحنة التقديري:</span>
                <strong className="text-2xl font-bold text-emerald-300 font-mono">
                  {formatCurrency(netProfitEgp)}
                </strong>
              </div>
              <div className="text-left">
                <span className="text-[11px] text-white/70 block font-sans">هامش الربح:</span>
                <strong className="text-lg font-bold text-emerald-300 font-mono">
                  {profitMarginPct.toFixed(2)}%
                </strong>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between text-xs font-mono">
              <span className="text-white/80 font-sans">صافي ربح الكيلوجرام:</span>
              <strong className="text-emerald-300 font-bold">
                {formatCurrency(profitPerKg)} / كجم
              </strong>
            </div>
          </div>

          {/* Readiness Footer */}
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-sans">
              صندوق المعاينة جاهز لاستقبال دالة الاعتماد وخصم المخزن في المايلستون 19.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
