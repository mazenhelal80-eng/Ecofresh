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
  Boxes,
  Building2,
  FileText,
  MapPin,
  PackageCheck,
  Phone,
  Receipt,
  Truck,
} from "lucide-react";

export const metadata = {
  title: "تفاصيل وحساب المورد | EcoFresh",
};

interface SupplierDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function SupplierDetailsPage({ params }: SupplierDetailsPageProps) {
  const [supplier, summary, accounts] = await Promise.all([
    prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        rawBatches: {
          take: 10,
          orderBy: { receivedDate: "desc" },
        },
        deals: {
          take: 10,
          orderBy: { date: "desc" },
        },
        packagingPurchases: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getPartyFinancialSummary(params.id, "مورد معتمد"),
    getTreasuryAccounts(),
  ]);

  if (!supplier) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="gap-2 text-gray-700">
  <Link href="/suppliers">
            <ArrowRight className="h-4 w-4" /> العودة لقائمة الموردين
          </Link>
</Button>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
          حالة الاعتماد: {supplier.status}
        </Badge>
      </div>

      {/* Unified Financial Summary Component */}
      <PartyFinancialSummary summary={summary} treasuryAccounts={accounts} />

      {/* Supplier Master Info Card */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#012d1d] to-[#02472e] text-white p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-bold text-white">{supplier.name}</CardTitle>
                  <Badge className="bg-cyan-900 text-cyan-200 border-cyan-700 font-mono text-xs">
                    {supplier.code}
                  </Badge>
                </div>
                <p className="text-emerald-100 text-xs mt-0.5 flex items-center gap-2">
                  <span>تصنيف التوريد: {supplier.type}</span>
                  {supplier.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {supplier.location}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {supplier.phone && (
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-xs font-mono" dir="ltr">
                <Phone className="h-3.5 w-3.5 text-cyan-300" /> {supplier.phone}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Operational History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Raw Batches */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-emerald-700" />
              آخر توريدات خام زراعي ({supplier.rawBatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {supplier.rawBatches.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                لا توجد توريدات خام مسجلة لهذا المورد.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs font-mono">
                {supplier.rawBatches.map((b) => (
                  <div key={b.batchId} className="p-3.5 flex items-center justify-between hover:bg-gray-50/60">
                    <div>
                      <span className="font-bold text-gray-900 block">{b.rawProduct}</span>
                      <span className="text-[11px] text-gray-400">
                        كود اللوط: {b.batchId} • {new Date(b.receivedDate).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-emerald-700 block">
                        {Number(b.grossQtyKg).toLocaleString()} كجم
                      </span>
                      <span className="text-[11px] text-gray-500 font-sans">
                        {Number(b.totalPayableEgp).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Direct Deals & Packaging */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-700" />
              صفقات الشراء ومستلزمات التعبئة ({supplier.deals.length + supplier.packagingPurchases.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {supplier.deals.length === 0 && supplier.packagingPurchases.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                لا توجد صفقات أو مشتريات مستلزمات مسجلة.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs font-mono">
                {supplier.deals.map((d) => {
                  const isCancelled = d.status === "ملغاة";
                  return (
                    <div key={d.dealId} className={`p-3.5 flex items-center justify-between hover:bg-gray-50/60 ${isCancelled ? "opacity-60 bg-rose-50/30" : ""}`}>
                      <div>
                        <span className={`font-bold block font-sans ${isCancelled ? "line-through text-gray-500" : "text-gray-900"}`}>
                          صفقة جاهز: {d.productName} {isCancelled && <span className="text-xs text-rose-600 font-bold font-sans">(ملغاة)</span>}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {d.dealId} • {new Date(d.date).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className={`font-bold block ${isCancelled ? "line-through text-gray-400" : "text-blue-700"}`}>
                          {Number(d.totalCost).toLocaleString()} ج.م
                        </span>
                        <span className="text-[11px] text-gray-500 font-sans">
                          {Number(d.qtyKg).toLocaleString()} كجم
                        </span>
                      </div>
                    </div>
                  );
                })}

                {supplier.packagingPurchases.map((pkg) => (
                  <div key={pkg.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50/60">
                    <div>
                      <span className="font-bold text-gray-900 block font-sans">
                        شراء مستلزمات تعبئة
                      </span>
                      <span className="text-[11px] text-gray-400">
                        فاتورة: {pkg.invoiceNo || pkg.id}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-purple-700 block">
                        {Number(pkg.totalCost).toLocaleString()} ج.م
                      </span>
                      <span className="text-[11px] text-gray-500 font-sans">
                        {Number(pkg.qty).toLocaleString()} وحدة
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
