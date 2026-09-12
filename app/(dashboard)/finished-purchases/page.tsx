import Link from "next/link";
import { PlusCircle, PackageCheck, Truck, Calendar, ArrowUpRight, Building2 } from "lucide-react";

import { getDirectDeals } from "@/actions/direct-deals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CancelOperationModal } from "@/components/modules/common/cancel-operation-modal";

export const dynamic = "force-dynamic";

export default async function FinishedPurchasesPage() {
  const deals = await getDirectDeals();

  const activeDeals = deals.filter((d) => d.status !== "ملغاة");
  const totalSpent = activeDeals.reduce((acc, d) => acc + Number(d.totalCost), 0);
  const totalKg = activeDeals.reduce((acc, d) => acc + Number(d.qtyKg), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">صفقات الجاهز المباشرة (المنتج التام)</h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة صفقات شراء المحاصيل المجهزة والمعبأة جاهزة للتصدير من الموردين والتجار الخارجيين
          </p>
        </div>
        <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2">
          <Link href="/finished-purchases/new">
            <PlusCircle className="h-4 w-4" /> تسجيل صفقة جاهز جديدة
          </Link>
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">عدد صفقات الجاهز النشطة</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {activeDeals.length} صفقة{" "}
                {deals.length > activeDeals.length ? (
                  <span className="text-xs font-normal text-rose-600">
                    ({deals.length - activeDeals.length} ملغاة)
                  </span>
                ) : null}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <PackageCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">إجمالي الكمية المشتراة (النشطة)</p>
              <h3 className="text-2xl font-bold text-emerald-800 mt-1">{totalKg.toLocaleString()} كجم</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">إجمالي التكلفة شاملة النولون</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">
                {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deals List */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50 border-b py-4">
          <CardTitle className="text-base font-bold text-gray-900">سجل صفقات الجاهز المباشرة</CardTitle>
          <CardDescription className="text-xs text-gray-500">
            الصفقات المبرمة لشراء محاصيل جاهزة معتمدة محولّة إلى محطات الشركة
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {deals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <PackageCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">لا توجد صفقات شراء جاهز مسجلة حتى الآن</p>
              <p className="text-xs text-gray-500 mt-1">اضغط على زر "تسجيل صفقة جاهز جديدة" لإضافة أول صفقة مباشرة.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                  <tr>
                    <th className="p-3">رمز الصفقة</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">اسم المنتج / الصنف</th>
                    <th className="p-3">المورد</th>
                    <th className="p-3">المحطة المستلمة</th>
                    <th className="p-3">الكمية (كجم)</th>
                    <th className="p-3">سعر الكيلو</th>
                    <th className="p-3">النولون</th>
                    <th className="p-3">إجمالي الصفقة</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-800">
                  {deals.map((d) => {
                    const isCancelled = d.status === "ملغاة";
                    return (
                      <tr
                        key={d.dealId}
                        className={`transition-colors ${
                          isCancelled ? "bg-rose-50/40 text-gray-400" : "hover:bg-gray-50/80"
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-emerald-950">
                          {d.dealId}
                        </td>
                        <td className="p-3 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {new Date(d.date).toLocaleDateString("ar-EG")}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className={`font-medium ${isCancelled ? "line-through" : ""}`}>{d.productName}</div>
                          {d.packageType && <span className="text-xs text-gray-500">{d.packageType}</span>}
                        </td>
                        <td className="p-3 font-medium">{d.supplier.name}</td>
                        <td className="p-3 text-xs">
                          <div className="flex items-center gap-1 text-gray-700">
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                            {d.station.name}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-gray-900 font-mono">
                          {Number(d.qtyKg).toLocaleString()} كجم
                        </td>
                        <td className="p-3 font-mono">{Number(d.purchasePricePerKg).toFixed(2)} ج.م</td>
                        <td className="p-3 font-mono text-xs text-amber-700">
                          {Number(d.transportCost).toLocaleString()} ج.م
                        </td>
                        <td className="p-3 font-bold text-emerald-800 font-mono">
                          {Number(d.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-3 text-center">
                          {isCancelled ? (
                            <Badge variant="destructive" className="bg-rose-100 text-rose-800 border-rose-200">
                              ملغاة
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                              تم الاستلام
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!isCancelled && (
                            <CancelOperationModal
                              operationType="direct-deal"
                              operationId={d.dealId}
                              operationLabel={`صفقة الجاهز: ${d.dealId} (${d.productName} - ${Number(d.qtyKg).toLocaleString()} كجم)`}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
