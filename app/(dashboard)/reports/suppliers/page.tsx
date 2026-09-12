export const dynamic = "force-dynamic";
import React from "react";
import Link from "next/link";
import { getSuppliersPerformanceReport } from "@/lib/data/reports";
import { ArrowRight, Users, CheckCircle, AlertTriangle, ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "بطاقة جودة الموردين | EcoFresh",
};

export default async function SuppliersPerformanceReportPage() {
  const suppliers = await getSuppliersPerformanceReport();

  const totalSuppliedKg = suppliers.reduce((s, sup) => s + sup.totalQtySupplied, 0);
  const totalVolumeEgp = suppliers.reduce((s, sup) => s + sup.totalVolumeEgp, 0);
  const avgApprovalRate =
    suppliers.length > 0
      ? suppliers.reduce((s, sup) => s + sup.approvalRatePct, 0) / suppliers.length
      : 100;

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
            <span>بطاقة الموردين</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            بطاقة أداء وجودة تقييم الموردين
          </h1>
          <p className="text-muted-foreground mt-1">
            تحليل نتائج الفحص الجودي والتسليمات المعتمدة لموردي المحاصيل والمستلزمات
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto print:hidden">
          <a
            href="/api/export/excel/suppliers"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
          >
            تصدير إكسيل (Excel)
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">عدد الموردين المعالجين</p>
            <h3 className="text-2xl font-bold text-foreground mt-1 font-mono">
              {suppliers.length} موردين
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">إجمالي التوريدات (كجم)</p>
            <h3 className="text-2xl font-bold text-primary mt-1 font-mono">
              {totalSuppliedKg.toLocaleString("ar-EG")} كجم
            </h3>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground font-medium">متوسط نسبة قبول التوريدات</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {avgApprovalRate.toFixed(1)}%
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm text-right">
          <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="p-3 text-right">المورد</th>
              <th className="p-3 text-right">التصنيف</th>
              <th className="p-3 text-center">عدد اللوطات</th>
              <th className="p-3 text-center">معتمد (Approved)</th>
              <th className="p-3 text-center">معلق (Pending)</th>
              <th className="p-3 text-center">مرفوض (Rejected)</th>
              <th className="p-3 text-center">إجمالي الكمية الموردة (كجم)</th>
              <th className="p-3 text-center">نسبة القبول الفني (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  لا يوجد موردون مسجلون في النظام حتى الآن.
                </td>
              </tr>
            ) : (
              suppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-semibold text-foreground">
                    {sup.name}
                    <span className="block text-xs text-muted-foreground font-mono">
                      ({sup.code})
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{sup.type}</td>
                  <td className="p-3 text-center font-mono font-medium">
                    {sup.batchesCount}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {sup.approvedCount}
                  </td>
                  <td className="p-3 text-center font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {sup.pendingCount}
                  </td>
                  <td className="p-3 text-center font-mono font-semibold text-rose-600 dark:text-rose-400">
                    {sup.rejectedCount}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-foreground">
                    {sup.totalQtySupplied.toLocaleString("ar-EG")}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {sup.approvalRatePct.toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
