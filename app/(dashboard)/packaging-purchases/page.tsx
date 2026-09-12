import Link from "next/link";
import { PlusCircle, ShoppingBag, Truck, Calendar, ArrowUpRight } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PackagingPurchasesPage() {
  const purchases = await prisma.packagingPurchase.findMany({
    include: {
      supply: true,
      supplier: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalSpent = purchases.reduce((acc: number, p) => acc + Number(p.totalCost), 0);
  const totalItems = purchases.reduce((acc: number, p) => acc + Number(p.qty), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مشتريات مستلزمات التعبئة والتغليف</h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة فواتير شراء الكراتين والشريط والتسميد والمستلزمات وزيادة مخزون المحطة
          </p>
        </div>
        <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2">
  <Link href="/packaging-purchases/new">
            <PlusCircle className="h-4 w-4" /> فاتورة شراء جديدة
          </Link>
</Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">إجمالي المشتريات المسجلة</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{purchases.length} عمليات</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">إجمالي المستلزمات المشتراة</p>
              <h3 className="text-2xl font-bold text-emerald-800 mt-1">{totalItems.toLocaleString()} وحدة</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">إجمالي قيمة الفواتير</p>
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

      {/* Purchases List */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50 border-b py-4">
          <CardTitle className="text-base font-bold text-gray-900">سجل فواتير المشتريات</CardTitle>
          <CardDescription className="text-xs text-gray-500">
            فواتير توريد المستلزمات التي تمت إضافتها للمخزن وتوثيق استحقاق الموردين
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {purchases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">لا توجد فواتير مشتريات مستلزمات مسجلة حتى الآن</p>
              <p className="text-xs text-gray-500 mt-1">اضغط على زر "فاتورة شراء جديدة" لإضافة أول عملية توريد.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                  <tr>
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">المستلزم</th>
                    <th className="p-3">المورد</th>
                    <th className="p-3">الكمية</th>
                    <th className="p-3">سعر الوحدة</th>
                    <th className="p-3">الإجمالي (ج.م)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-800">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-950">
                        {p.invoiceNo || `PUR-${p.id.substring(0, 6)}`}
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(p.createdAt).toLocaleDateString("ar-EG")}
                        </div>
                      </td>
                      <td className="p-3 font-medium">
                        {p.supply.name} <Badge variant="outline" className="text-xs mr-1">{p.supply.code}</Badge>
                      </td>
                      <td className="p-3 font-medium">{p.supplier.name}</td>
                      <td className="p-3 font-bold text-gray-900">
                        {Number(p.qty).toLocaleString()} {p.supply.unit}
                      </td>
                      <td className="p-3 font-mono">{Number(p.unitPrice).toFixed(2)} ج.م</td>
                      <td className="p-3 font-bold text-emerald-800 font-mono">
                        {Number(p.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
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
