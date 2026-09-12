"use client";

import React from "react";
import { Truck, Scale, DollarSign, Award, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { ProcurementReportData } from "@/lib/reports/types";

interface ProcurementReportViewProps {
  data: ProcurementReportData;
}

export function ProcurementReportView({ data }: ProcurementReportViewProps) {
  const {
    totalRawSpendEgp,
    totalRawQtyKg,
    avgRawPricePerKg,
    totalSuppliesSpendEgp,
    totalPurchasesSpendEgp,
    suppliers,
    topSupplierByVolume,
    topSupplierBySpend,
  } = data;

  const sortedSuppliers = [...suppliers].sort((a, b) => b.totalSpendEgp - a.totalSpendEgp);

  return (
    <div className="space-y-6">
      {/* 1. Procurement KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">إجمالي مشتريات الخام</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-foreground">
                {formatCurrency(totalRawSpendEgp)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {totalRawQtyKg.toLocaleString()} كجم مستلم
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">متوسط سعر شراء الخام</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-primary">
                {avgRawPricePerKg.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">ج.م / كجم</span>
            </div>
            <p className="text-[11px] text-muted-foreground">محسوب بمتوسط مرجح بالكميات</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">مشتريات مستلزمات التعبئة</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-foreground">
                {formatCurrency(totalSuppliesSpendEgp)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">كرتون وأكياس وبالتات</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">إجمالي إنفاق التوريدات</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-foreground">
                {formatCurrency(totalPurchasesSpendEgp)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">خام + صفقات + مستلزمات</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Top Supplier Spotlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topSupplierByVolume && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Award className="h-4 w-4" />
                المورد الأعلى توريداً من حيث الكمية
              </span>
              <p className="text-lg font-bold text-foreground">{topSupplierByVolume.name}</p>
            </div>
            <div className="text-left font-mono">
              <p className="text-xl font-bold text-primary">
                {topSupplierByVolume.qtyKg.toLocaleString()}
              </p>
              <span className="text-xs text-muted-foreground">كجم خام</span>
            </div>
          </div>
        )}

        {topSupplierBySpend && (
          <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                المورد الأعلى قيمة مالية
              </span>
              <p className="text-lg font-bold text-foreground">{topSupplierBySpend.name}</p>
            </div>
            <div className="text-left font-mono">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(topSupplierBySpend.spendEgp)}
              </p>
              <span className="text-xs text-muted-foreground">إجمالي المستحق</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Detailed Supplier Contribution Table */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <div className="border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">جدول مساهمة الموردين وأسعار التوريد</h3>
          <p className="text-xs text-muted-foreground">
            تحليل التوريدات لكل مورد، متوسط سعر الكيلو جرام، وحصة الإنفاق من إجمالي المشتريات
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 font-bold text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3">اسم المورد</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3 font-mono">عدد اللوطات</th>
                <th className="p-3 font-mono">الكمية الإجمالية (كجم)</th>
                <th className="p-3 font-mono">إجمالي المستحق (ج.م)</th>
                <th className="p-3 font-mono">متوسط السعر / كجم</th>
                <th className="p-3 font-mono">حصة الإنفاق %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {sortedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground font-sans">
                    لا توجد توريدات مسجلة خلال الفترة المحددة.
                  </td>
                </tr>
              ) : (
                sortedSuppliers.map((sup) => (
                  <tr key={sup.supplierId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-sans font-bold text-foreground">{sup.supplierName}</td>
                    <td className="p-3 font-sans text-muted-foreground">{sup.supplierType}</td>
                    <td className="p-3 font-bold text-foreground">{sup.batchesCount}</td>
                    <td className="p-3 font-semibold text-foreground">{sup.totalQtyKg.toLocaleString()} كجم</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(sup.totalSpendEgp)}
                    </td>
                    <td className="p-3 font-bold text-foreground">{sup.avgPricePerKg.toFixed(2)} ج.م</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, sup.shareOfSpendPct)}%` }}
                          />
                        </div>
                        <span className="font-bold text-foreground">{sup.shareOfSpendPct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
