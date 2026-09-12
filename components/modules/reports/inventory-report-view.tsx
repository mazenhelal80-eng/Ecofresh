"use client";

import React from "react";
import { Warehouse, ArrowDownRight, ArrowUpRight, History, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InventoryReportData } from "@/lib/reports/types";

interface InventoryReportViewProps {
  data: InventoryReportData;
}

export function InventoryReportView({ data }: InventoryReportViewProps) {
  const { categories, recentMovements } = data;

  return (
    <div className="space-y-6">
      {/* 1. Category Reconciliation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <Card key={cat.category} className="border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{cat.nameAr}</h3>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {cat.movementsCount} حركات مسجلة
                    </span>
                  </div>
                </div>
              </div>

              {/* Balances reconciliation */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">رصيد أول المدة التقديري</span>
                  <span className="font-mono font-bold text-foreground">
                    {cat.openingQty.toLocaleString()} {cat.unit}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border/50 text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    الوارد والمضاف (Inflow)
                  </span>
                  <span className="font-mono font-bold">
                    +{cat.inflowQty.toLocaleString()} {cat.unit}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border/50 text-rose-600 dark:text-rose-400">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    المنصرف والمستهلك (Outflow)
                  </span>
                  <span className="font-mono font-bold">
                    -{cat.outflowQty.toLocaleString()} {cat.unit}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 bg-muted/30 p-2.5 rounded-lg">
                  <span className="font-bold text-foreground">رصيد آخر المدة الفعلي</span>
                  <span className="font-mono font-bold text-base text-primary">
                    {cat.closingQty.toLocaleString()} {cat.unit}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Authoritative Stock Movement Ledger Audit Table */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <History className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-bold text-foreground">
              سجل حركات المخزون المركزية (StockMovement Ledger Source of Truth)
            </h3>
            <p className="text-xs text-muted-foreground">
              دفتر الحركات المخزنية غير القابل للتعديل موضحاً الوارد والمنصرف والتحويلات
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 font-bold text-muted-foreground border-b border-border">
              <tr>
                <th className="p-3">رقم الحركة</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">نوع الحركة</th>
                <th className="p-3">المخزن / النوع</th>
                <th className="p-3">الموقع / المحطة</th>
                <th className="p-3">اللوط / الصنف</th>
                <th className="p-3 font-mono text-center">الكمية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground font-sans">
                    لا توجد حركات مخزنية مسجلة خلال الفترة.
                  </td>
                </tr>
              ) : (
                recentMovements.map((m) => {
                  const isInflow = ['PURCHASE', 'PRODUCTION_IN', 'TRANSFER_IN', 'REVERSAL_IN'].includes(m.movementType);
                  return (
                    <tr key={m.movementNo} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-bold text-primary font-mono">{m.movementNo}</td>
                      <td className="p-3 text-muted-foreground">{m.date}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isInflow
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td className="p-3 font-sans font-medium text-foreground">{m.itemType}</td>
                      <td className="p-3 font-sans text-muted-foreground">{m.stationName}</td>
                      <td className="p-3 text-foreground font-medium">{m.productOrBatch}</td>
                      <td className={`p-3 text-center font-bold ${isInflow ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isInflow ? '+' : '-'}{m.qty.toLocaleString()} {m.unit}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
