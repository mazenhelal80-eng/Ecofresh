import Link from "next/link";
import { PlusCircle, ClipboardList, Ship, Globe, Calendar, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";

import { getClientOrders } from "@/actions/client-orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function ClientOrdersPage() {
  const orders = await getClientOrders();

  const totalOrderedKg = orders.reduce((acc, o) => acc + Number(o.orderedQtyKg), 0);
  const totalUnfulfilledKg = orders.reduce((acc, o) => acc + Number(o.unfulfilledQtyKg), 0);
  const totalFulfilledKg = totalOrderedKg - totalUnfulfilledKg;
  const overallFulfillmentRate = totalOrderedKg > 0 ? (totalFulfilledKg / totalOrderedKg) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">طلبيات التصدير الدولية (Export Client Orders)</h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة ومتابعة طلبيات العملاء الدولية ونسب الإيفاء بالحاويات
          </p>
        </div>
        <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2">
  <Link href="/client-orders/new">
            <PlusCircle className="h-4 w-4" /> تسجيل طلبية جديدة
          </Link>
</Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">إجمالي الطلبيات المسجلة</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{orders.length} طلبيات</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ClipboardList className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">إجمالي الكميات المطلوبة</p>
              <h3 className="text-2xl font-bold text-emerald-800 mt-1">{totalOrderedKg.toLocaleString()} كجم</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Ship className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">معدل الإيفاء بالحاويات والشحن</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">
                {overallFulfillmentRate.toFixed(1)}%
              </h3>
              <span className="text-xs text-gray-500">
                المتبقي: {totalUnfulfilledKg.toLocaleString()} كجم
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Orders List */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50 border-b py-4">
          <CardTitle className="text-base font-bold text-gray-900">سجل طلبيات التصدير المعلقة والمكتملة</CardTitle>
          <CardDescription className="text-xs text-gray-500">
            الطلبيات المتعاقد عليها مع العملاء الدوليين وتتبع الشحنات المجهزة
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">لا توجد طلبيات تصدير مسجلة حتى الآن</p>
              <p className="text-xs text-gray-500 mt-1">اضغط على زر "تسجيل طلبية جديدة" لإضافة أول طلبية تعاقدية.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                  <tr>
                    <th className="p-3">رقم الطلبية</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">العميل والدولة</th>
                    <th className="p-3">المنتج والمواصفة</th>
                    <th className="p-3">الكمية (كجم)</th>
                    <th className="p-3">السعر</th>
                    <th className="p-3">نسبة الإيفاء</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-800">
                  {orders.map((o) => {
                    const ordered = Number(o.orderedQtyKg);
                    const unfulfilled = Number(o.unfulfilledQtyKg);
                    const fulfilled = ordered - unfulfilled;
                    const pct = ordered > 0 ? Math.round((fulfilled / ordered) * 100) : 0;

                    return (
                      <tr key={o.orderId} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-emerald-950">
                          {o.orderId}
                        </td>
                        <td className="p-3 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {new Date(o.orderDate).toLocaleDateString("ar-EG")}
                          </div>
                        </td>
                        <td className="p-3 font-medium">
                          <div>{o.customer.name}</div>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Globe className="h-3 w-3" /> {o.customer.country}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{o.productName}</div>
                          <span className="text-xs text-gray-500">{o.packagingSpec}</span>
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          {ordered.toLocaleString()} كجم
                        </td>
                        <td className="p-3 font-mono font-bold text-[#012d1d]">
                          {formatCurrency(Number(o.unitPriceEur))} / كجم
                        </td>
                        <td className="p-3">
                          <div className="w-32 space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span>{pct}%</span>
                              <span className="text-gray-400 text-[10px]">
                                {fulfilled.toLocaleString()} / {ordered.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {pct === 100 ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> مكتملة
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 gap-1">
                              <Clock className="h-3 w-3" /> {o.status}
                            </Badge>
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
