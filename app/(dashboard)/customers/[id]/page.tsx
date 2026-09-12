export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Globe,
  CreditCard,
  Phone,
  Mail,
  User,
  ArrowRight,
  FileText,
  PackageCheck,
  CheckCircle2,
} from "lucide-react";
import { getCustomerById, getProductsForSelect } from "@/actions/customers";
import { getPartyFinancialSummary } from "@/lib/data/ledger";
import { getTreasuryAccounts } from "@/actions/treasury";
import { PartyFinancialSummary } from "@/components/modules/financials/party-financial-summary";
import { AgreementModal } from "@/components/modules/customers/agreement-modal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

export const metadata = {
  title: "تفاصيل العميل والاتفاقيات | EcoFresh",
};

interface CustomerDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function CustomerDetailsPage({ params }: CustomerDetailsPageProps) {
  const [customer, summary, accounts, products] = await Promise.all([
    getCustomerById(params.id),
    getPartyFinancialSummary(params.id, "عميل تصدير"),
    getTreasuryAccounts(),
    getProductsForSelect(),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="gap-2 text-gray-700">
  <Link href="/customers">
            <ArrowRight className="h-4 w-4" /> العودة لدليل العملاء
          </Link>
</Button>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
          حالة العميل: {customer.status}
        </Badge>
      </div>

      {/* Unified Financial Summary Component */}
      <PartyFinancialSummary summary={summary} treasuryAccounts={accounts} />

      {/* Customer Header Info Card */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-900 to-[#012d1d] text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl font-bold text-white">{customer.name}</CardTitle>
                  <Badge className="bg-cyan-900 text-cyan-200 border-cyan-700 font-mono">
                    {customer.code}
                  </Badge>
                </div>
                <CardDescription className="text-emerald-100 text-xs mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" /> {customer.country}
                  </span>
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg border border-white/20">
              <CreditCard className="h-5 w-5 text-amber-300" />
              <div className="flex flex-col text-right">
                <span className="text-xs text-emerald-200 font-semibold">الحد الائتماني المعتمد</span>
                <span className="text-lg font-bold text-white">
                  {formatCurrency(Number(customer.creditLimit || 0))}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 block">شروط وتسهيلات السداد</span>
            <span className="text-sm font-bold text-gray-800 block">{customer.paymentTerms}</span>
          </div>

          {customer.contactPerson && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 block">مسؤول التواصل بالشركة</span>
              <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <User className="h-4 w-4 text-emerald-600" /> {customer.contactPerson}
              </span>
            </div>
          )}

          {(customer.phone || customer.email) && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 block">بيانات الاتصال</span>
              <div className="text-sm text-gray-700 font-mono space-y-0.5" dir="ltr">
                {customer.phone && (
                  <div className="flex items-center gap-1.5 justify-end">
                    <Phone className="h-3.5 w-3.5 text-blue-500" /> {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-1.5 justify-end">
                    <Mail className="h-3.5 w-3.5 text-amber-500" /> {customer.email}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Price Agreements Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#012d1d]" />
            <h2 className="text-lg font-bold text-gray-900">
              اتفاقيات الأسعار التعاقدية للمنتجات
            </h2>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-300">
              {customer.agreements.length} اتفاقية
            </Badge>
          </div>

          <AgreementModal
            customerId={customer.id}
            customerName={customer.name}
            currency="EGP"
            products={products}
          />
        </div>

        <Card className="overflow-hidden border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-700 border-b font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">كود الصنف</th>
                    <th className="py-3.5 px-4">اسم المنتج التصديري</th>
                    <th className="py-3.5 px-4">فئة الصنف</th>
                    <th className="py-3.5 px-4">السعر التعاقدي للكيلو</th>
                    <th className="py-3.5 px-4">مواصفات التعبئة والتغليف</th>
                    <th className="py-3.5 px-4 text-center">حالة الاتفاقية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customer.agreements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        لا توجد اتفاقيات أسعار مسجلة لهذا العميل حالياً. انقر على زر "إضافة اتفاقية سعر صنف" للبدء.
                      </td>
                    </tr>
                  ) : (
                    customer.agreements.map((agr) => {
                      const priceNum = Number(agr.targetPriceEur || 0);

                      return (
                        <tr key={agr.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                            {agr.product.code}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-800 flex items-center gap-2">
                            <PackageCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                            {agr.product.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                              {agr.product.category}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#012d1d] text-base">
                            {formatCurrency(priceNum)} / كجم
                          </td>
                          <td className="py-3.5 px-4 text-gray-700 font-medium">
                            {agr.packagingSpec}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> مفعّلة
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
