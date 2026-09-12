export const dynamic = "force-dynamic";
import React from "react";
import Link from "next/link";
import { getShipmentsProfitabilityReport } from "@/lib/data/reports";
import { ProfitabilityChart } from "@/components/modules/reports/profitability-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Ship, DollarSign, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export const metadata = {
  title: "تقرير ربحية الشحنات | EcoFresh",
};

export default async function ShipmentsProfitabilityReportPage() {
  const report = await getShipmentsProfitabilityReport();
  const { summary, shipmentsList } = report;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/reports" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              مركز التقارير
            </Link>
            <span>/</span>
            <span>ربحية الشحنات</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            تقرير ربحية الشحنات ومعدلات الهوامش
          </h1>
          <p className="text-muted-foreground mt-1">
            متابعة الإيرادات الإجمالية، التكاليف التشغيلية وصافي ربح الحاويات المصدرة
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto print:hidden">
          <a
            href="/api/export/excel/profitability"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
          >
            تصدير إكسيل (Excel)
          </a>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">عدد الشحنات المنفذة</p>
            <h3 className="text-2xl font-bold text-foreground mt-1 font-mono">
              {summary.shipmentsCount} شحنات
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">إجمالي الإيرادات (Gross Revenue)</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {formatCurrency(summary.totalRevenue)}
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">إجمالي التكاليف (Total Cost)</p>
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
              {formatCurrency(summary.totalCost)}
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">متوسط هامش الربح (Margin)</p>
            <h3 className="text-2xl font-bold text-primary mt-1 font-mono">
              {summary.averageMargin.toFixed(2)}%
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Profitability Visual Comparison Chart */}
      <ProfitabilityChart
        totalRevenue={summary.totalRevenue}
        totalCost={summary.totalCost}
        totalProfit={summary.totalProfit}
        averageMargin={summary.averageMargin}
      />

      {/* Detailed Shipments Table */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-foreground">جدول ربحية الشحنات التفصيلي</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm text-right">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="p-3 text-right">رقم الشحنة</th>
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">رقم الحاوية</th>
                <th className="p-3 text-center">الكمية (كجم)</th>
                <th className="p-3 text-center">سعر البيع (ج.م)</th>
                <th className="p-3 text-center">الإيراد الإجمالي (ج.م)</th>
                <th className="p-3 text-center">التكلفة الكلية (ج.م)</th>
                <th className="p-3 text-center">صافي الربح (ج.م)</th>
                <th className="p-3 text-center">هامش الربح (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shipmentsList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    لا توجد شحنات مسجلة في النظام حتى الآن.
                  </td>
                </tr>
              ) : (
                shipmentsList.map((sh) => (
                  <tr key={sh.shipmentId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-semibold text-primary">
                      {sh.shipmentId}
                    </td>
                    <td className="p-3 font-medium text-foreground">{sh.customerName}</td>
                    <td className="p-3 font-mono text-sm text-muted-foreground">
                      {sh.containerNo}
                    </td>
                    <td className="p-3 text-center font-mono">
                      {sh.shippedQtyKg.toLocaleString("ar-EG")}
                    </td>
                    <td className="p-3 text-center font-mono font-medium">
                      {formatCurrency(sh.sellingPriceEur)}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(sh.grossRevenueEgp)}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {formatCurrency(sh.totalCostEgp)}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-primary">
                      {formatCurrency(sh.netProfitEgp)}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {sh.marginPercent.toFixed(2)}%
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
