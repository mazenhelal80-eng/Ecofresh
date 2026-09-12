import React from "react";
import { Scale, DollarSign, Package, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

interface WasteKpiCardsProps {
  totalRawWasteKg: number;
  totalRawWasteEgp: number;
  totalSuppliesWasteEgp: number;
  grandTotalWasteLoss: number;
  overallWastePct: number;
  standardWastePct: number;
  operationsCount?: number;
  comparison?: {
    qtyDiff: number;
    qtyPctChange: number;
    qtyDirection: 'UP' | 'DOWN' | 'EQUAL';
    costDiff: number;
    costPctChange: number;
    costDirection: 'UP' | 'DOWN' | 'EQUAL';
    prevWasteKg: number;
    prevWasteCost: number;
  };
}

export function WasteKpiCards({
  totalRawWasteKg,
  totalRawWasteEgp,
  totalSuppliesWasteEgp,
  grandTotalWasteLoss,
  overallWastePct,
  standardWastePct,
  operationsCount = 0,
  comparison,
}: WasteKpiCardsProps) {
  const isWithinStandard = overallWastePct <= standardWastePct;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Raw Waste (Kg) */}
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">إجمالي هالك الخام المسجل</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 shrink-0">
              <Scale className="h-5 w-5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-rose-700 font-mono">
                {totalRawWasteKg.toLocaleString()}
              </p>
              <span className="text-xs text-rose-600 font-medium">كجم</span>
            </div>

            {comparison && (
              <div className="flex items-center gap-1.5 mt-2">
                {comparison.qtyDirection === 'UP' ? (
                  <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                    <ArrowUpRight className="h-3 w-3" />
                    +{comparison.qtyPctChange}% عن الفترة السابقة
                  </span>
                ) : comparison.qtyDirection === 'DOWN' ? (
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    <ArrowDownRight className="h-3 w-3" />
                    {comparison.qtyPctChange}% عن الفترة السابقة
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500 font-mono">
                    لا تغيير عن الفترة السابقة
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Waste Financial Cost (EGP) */}
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">التكلفة المالية الإجمالية للهالك</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-rose-700 font-mono">
                {formatCurrency(grandTotalWasteLoss)}
              </p>
            </div>

            {comparison && (
              <div className="flex items-center gap-1.5 mt-2">
                {comparison.costDirection === 'UP' ? (
                  <span className="inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                    <ArrowUpRight className="h-3 w-3" />
                    +{comparison.costPctChange}% تكلفة إضافية
                  </span>
                ) : comparison.costDirection === 'DOWN' ? (
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    <ArrowDownRight className="h-3 w-3" />
                    {comparison.costPctChange}% وفر تكلفة
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500 font-mono">
                    مطابق للفترة السابقة
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Waste Rate (%) vs Standard */}
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">معدل الهالك الفعلي (Waste Rate)</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 shrink-0">
              <Package className="h-5 w-5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <p className={`text-2xl font-bold font-mono ${isWithinStandard ? 'text-gray-900' : 'text-rose-700'}`}>
                {overallWastePct.toFixed(1)}%
              </p>
              <span className="text-xs text-gray-500">من إجمالي مدخلات الخام</span>
            </div>

            <div className="mt-2">
              {isWithinStandard ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  مطابق للمعيار (≤ 20.0%)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  تجاوز المعيار (&gt; 20.0%)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Number of Operations */}
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">عمليات التشغيل المسجلة</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {operationsCount.toLocaleString()}
              </p>
              <span className="text-xs text-gray-500">أمر تشغيل</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-2 font-mono">
              هالك مستلزمات: {formatCurrency(totalSuppliesWasteEgp)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
