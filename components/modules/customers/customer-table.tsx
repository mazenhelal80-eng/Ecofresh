"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Globe, CreditCard, ChevronLeft, Building2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteCustomer } from "@/actions/customers";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

interface CustomerItem {
  id: string;
  code: string;
  name: string;
  country: string;
  currency: string;
  paymentTerms: string;
  creditLimit: any;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  agreements?: any[];
}

interface CustomerTableProps {
  customers: CustomerItem[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت تأكد من حذف العميل ${name}؟`)) {
      startTransition(async () => {
        const res = await deleteCustomer(id);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.error);
        }
      });
    }
  };

  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b font-semibold">
              <tr>
                <th className="py-3.5 px-4">كود العميل</th>
                <th className="py-3.5 px-4">اسم الشركة / العميد</th>
                <th className="py-3.5 px-4">الدولة والعملة</th>
                <th className="py-3.5 px-4">الحد الائتماني وشروط الدفع</th>
                <th className="py-3.5 px-4 text-center">عدد الاتفاقيات</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    لا يوجد عملاء تصدير مسجلون حالياً
                  </td>
                </tr>
              ) : (
                customers.map((item) => {
                  const creditLimitNum = Number(item.creditLimit || 0);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                        {item.code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-emerald-700 shrink-0" />
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-900 border-emerald-200 gap-1"
                          >
                            <Globe className="h-3 w-3" /> {item.country}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-800 font-bold"
                          >
                            ج.م
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 flex items-center gap-1">
                            <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                            {formatCurrency(creditLimitNum)}
                          </span>
                          <span className="text-xs text-gray-500 font-normal">
                            {item.paymentTerms}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200">
                          {item.agreements?.length || 0} اتفاقية أسعار
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button asChild size="sm" variant="ghost" className="gap-1 text-[#012d1d] hover:bg-emerald-50">
  <Link href={`/customers/${item.id}`}>
                              عرض التفاصيل والاتفاقيات <ChevronLeft className="h-4 w-4" />
                            </Link>
</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleDelete(item.id, item.name)}
                            className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
  );
}

