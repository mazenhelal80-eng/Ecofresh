export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPartyFinancialSummary } from "@/lib/data/ledger";
import { getTreasuryAccounts } from "@/actions/treasury";
import { PartyFinancialSummary } from "@/components/modules/financials/party-financial-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building2,
  Cpu,
  Factory,
  FileText,
  Hammer,
  Phone,
  Receipt,
  Scale,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "تفاصيل وحساب مقاول التشغيل | EcoFresh",
};

interface ContractorDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function ContractorDetailsPage({ params }: ContractorDetailsPageProps) {
  const [contractor, summary, accounts] = await Promise.all([
    prisma.contractor.findUnique({
      where: { id: params.id },
      include: {
        operations: {
          orderBy: { date: "desc" },
          include: {
            station: true,
          },
        },
      },
    }),
    getPartyFinancialSummary(params.id, "مقاول تشغيل وعمالة"),
    getTreasuryAccounts(),
  ]);

  if (!contractor) {
    notFound();
  }

  // Compute breakdown by station
  const stationBreakdownMap = contractor.operations.reduce((acc, op) => {
    const stnId = op.stationId;
    const stnName = op.station?.name || stnId;
    if (!acc[stnId]) {
      acc[stnId] = {
        stationId: stnId,
        stationName: stnName,
        totalQtyKg: 0,
        totalCost: 0,
        count: 0,
      };
    }
    acc[stnId].totalQtyKg += Number(op.finishedOutputKg || 0);
    acc[stnId].totalCost += Number(op.contractorCost || 0);
    acc[stnId].count += 1;
    return acc;
  }, {} as Record<string, { stationId: string; stationName: string; totalQtyKg: number; totalCost: number; count: number }>);

  const breakdownList = Object.values(stationBreakdownMap);
  const totalQtyKgAll = breakdownList.reduce((acc, s) => acc + s.totalQtyKg, 0);
  const totalCostAll = breakdownList.reduce((acc, s) => acc + s.totalCost, 0);

  return (
    <div className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="gap-2 text-gray-700">
          <Link href="/contractors">
            <ArrowRight className="h-4 w-4" /> العودة لقائمة المقاولين
          </Link>
        </Button>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
          حالة المقاول: {contractor.isActive ? "نشط معتمد" : "غير نشط"}
        </Badge>
      </div>

      {/* Unified Financial Summary Component */}
      <PartyFinancialSummary summary={summary} treasuryAccounts={accounts} />

      {/* Contractor Master Info Card */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#012d1d] to-[#02472e] text-white p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                <Hammer className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-bold text-white">{contractor.name}</CardTitle>
                  <Badge className="bg-cyan-900 text-cyan-200 border-cyan-700 font-mono text-xs">
                    {contractor.id}
                  </Badge>
                </div>
                <p className="text-emerald-100 text-xs mt-0.5 flex items-center gap-2">
                  <span className="bg-emerald-800/60 px-2 py-0.5 rounded text-emerald-200">
                    نطاق العمل: مقاول عام (يعمل عبر كافة محطات التشغيل)
                  </span>
                  {contractor.specialization && (
                    <>
                      <span>•</span>
                      <span>التخصص: {contractor.specialization}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <Scale className="h-4 w-4 text-cyan-300" />
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-emerald-200">تعريفة التشغيل والفرز</span>
                <span className="text-sm font-bold text-white font-mono">
                  {Number(contractor.tariffRatePerKg).toFixed(2)} ج.م / كجم
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Multi-Station Breakdown & Settlement Summary Card */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-700" />
            توزيع العمليات والمستحقات حسب محطات التشغيل ({breakdownList.length} محطات)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {breakdownList.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-500">
              لم يقم المقاول بأي عمليات تشغيل في المحطات حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">محطة التشغيل</th>
                    <th className="p-3 text-center">عدد العمليات</th>
                    <th className="p-3 font-mono">إجمالي الكمية المنتجة</th>
                    <th className="p-3 font-mono">الكمية بالأطنان</th>
                    <th className="p-3 font-mono">متوسط التعريفة</th>
                    <th className="p-3 font-mono">إجمالي أتعاب المقاول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {breakdownList.map((stn) => (
                    <tr key={stn.stationId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 font-sans font-bold text-gray-900 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{stn.stationName}</span>
                        <span className="text-[10px] text-gray-400">({stn.stationId})</span>
                      </td>
                      <td className="p-3 text-center font-bold text-gray-700">{stn.count} عملية</td>
                      <td className="p-3 font-bold text-emerald-700">
                        {stn.totalQtyKg.toLocaleString()} كجم
                      </td>
                      <td className="p-3 font-bold text-blue-700">
                        {(stn.totalQtyKg / 1000).toFixed(2)} طن
                      </td>
                      <td className="p-3 text-gray-700 font-sans">
                        {Number(contractor.tariffRatePerKg).toFixed(2)} ج.م/كجم
                      </td>
                      <td className="p-3 font-bold text-gray-900">
                        {stn.totalCost.toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-emerald-50/50 font-bold border-t-2 border-emerald-200">
                    <td className="p-3 font-sans text-emerald-900">
                      الإجمالي التراكمي لكافة المحطات
                    </td>
                    <td className="p-3 text-center text-emerald-900">{contractor.operations.length} عملية</td>
                    <td className="p-3 text-emerald-900 font-mono">
                      {totalQtyKgAll.toLocaleString()} كجم
                    </td>
                    <td className="p-3 text-blue-900 font-mono">
                      {(totalQtyKgAll / 1000).toFixed(2)} طن
                    </td>
                    <td className="p-3 text-emerald-900 font-sans">—</td>
                    <td className="p-3 text-emerald-900 font-mono">
                      {totalCostAll.toLocaleString()} ج.م
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operations History */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Factory className="h-4 w-4 text-emerald-700" />
            سجل عمليات التشغيل المنفذة ({contractor.operations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {contractor.operations.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              لا توجد عمليات تشغيل مسجلة لهذا المقاول حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">رقم العملية</th>
                    <th className="p-3">محطة التشغيل</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الخام المدخل</th>
                    <th className="p-3">المنتج التام الناتج</th>
                    <th className="p-3 font-mono">الكمية الناتجة (كجم)</th>
                    <th className="p-3 font-mono">نسبة التصافي</th>
                    <th className="p-3 font-mono">أتعاب المقاول المستحقة</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {contractor.operations.map((op) => (
                    <tr key={op.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 font-bold text-primary font-mono">{op.id}</td>
                      <td className="p-3 font-sans text-gray-800">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          <Building2 className="h-3 w-3 text-emerald-600" />
                          {op.station?.name || op.stationId}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">
                        {new Date(op.date).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-3 font-sans text-gray-800">{op.rawProduct}</td>
                      <td className="p-3 font-sans font-bold text-gray-900">{op.finishedProduct}</td>
                      <td className="p-3 font-bold text-emerald-700">
                        {Number(op.finishedOutputKg).toLocaleString()} كجم
                      </td>
                      <td className="p-3 text-gray-700">{Number(op.yieldPercent).toFixed(1)}%</td>
                      <td className="p-3 font-bold text-gray-900">
                        {Number(op.contractorCost).toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-center font-sans">
                        <Badge
                          variant="outline"
                          className={
                            op.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }
                        >
                          {op.status === "CANCELLED" ? "ملغاة" : "معتمدة"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
