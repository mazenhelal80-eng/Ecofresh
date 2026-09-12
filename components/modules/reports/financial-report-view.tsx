"use client";

import React from "react";
import { Wallet, Landmark, ArrowDownRight, ArrowUpRight, Receipt, DollarSign, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { FinancialReportData } from "@/lib/reports/types";

interface FinancialReportViewProps {
  data: FinancialReportData;
}

export function FinancialReportView({ data }: FinancialReportViewProps) {
  const { receivables, payables, cashFlow, expenses, treasuryByCurrency } = data;

  return (
    <div className="space-y-6">
      {/* 1. Top Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">المقبوضات النقدية (Cash In)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(cashFlow.inflowEgp)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">تحصيلات عملاء ومقبوضات مباشرة</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">المدفوعات النقدية (Cash Out)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatCurrency(cashFlow.outflowEgp)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">سدادات موردين ومقاولين ومصروفات</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">صافي التدفق النقدي (Net Cash)</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold font-mono ${cashFlow.netCashEgp >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatCurrency(cashFlow.netCashEgp)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">الفارق بين الداخل والخارج</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">إجمالي المصروفات التشغيلية</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-foreground">
                {formatCurrency(expenses.totalExpensesEgp)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">المسجلة بالدفاتر خلال الفترة</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. AR vs AP Ledger Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receivables AR */}
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground text-sm">حسابات ومستحقات العملاء (AR)</h3>
              </div>
              <span className="text-xs font-bold text-emerald-600">تحصيلات التصدير</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">إجمالي الفواتير الصادرة</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(receivables.totalBilledEgp)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50 text-emerald-600 dark:text-emerald-400">
                <span>المحصل فعلياً بالخزينة/البنوك</span>
                <span className="font-mono font-bold">
                  {formatCurrency(receivables.collectedEgp)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg text-amber-900 dark:text-amber-200">
                <span className="font-bold">المتبقي قيد التحصيل (Outstanding)</span>
                <span className="font-mono font-bold text-base">
                  {formatCurrency(receivables.remainingEgp)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payables AP */}
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-foreground text-sm">التزامات الموردين والمقاولين (AP)</h3>
              </div>
              <span className="text-xs font-bold text-rose-600">مستحقات التوريد والتشغيل</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">إجمالي الاستحقاقات المسجلة</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(payables.totalObligationsEgp)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50 text-rose-600 dark:text-rose-400">
                <span>المسدد فعلياً حتى الآن</span>
                <span className="font-mono font-bold">
                  {formatCurrency(payables.paidEgp)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-lg text-rose-900 dark:text-rose-200">
                <span className="font-bold">المتبقي المطلوب سداده</span>
                <span className="font-mono font-bold text-base">
                  {formatCurrency(payables.remainingEgp)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Multi-Currency Treasury Balances (Separated by Currency) */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-foreground">
                أرصدة الخزائن والحسابات البنكية حسب العملة (Multi-Currency Treasury)
              </h3>
              <p className="text-xs text-muted-foreground">
                عرض أرصدة كل عملة على حدة دون دمج محاسبي عشوائي للجنيه واليورو والدولار
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {treasuryByCurrency.map((curr) => (
            <div key={curr.currency} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-xs">
                    {curr.currency}
                  </span>
                  <span>حسابات عملة {curr.currency}</span>
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {curr.accountsCount} حسابات
                </span>
              </div>

              <div>
                <span className="text-xs text-muted-foreground">إجمالي الرصيد القائم:</span>
                <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                  {curr.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} {curr.currency}
                </p>
              </div>

              {/* Accounts list */}
              <div className="space-y-1.5 pt-2 border-t border-border/50 text-[11px]">
                {curr.accounts.map((acc) => (
                  <div key={acc.id} className="flex justify-between items-center text-muted-foreground">
                    <span className="truncate max-w-[140px]">{acc.name}</span>
                    <span className="font-mono font-bold text-foreground">
                      {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} {curr.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
