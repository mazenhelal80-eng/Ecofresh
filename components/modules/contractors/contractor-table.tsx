"use client";

import React, { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Building2, HardHat, DollarSign, Trash2 } from "lucide-react";
import { deleteContractor } from "@/actions/contractors";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import Link from "next/link";

export interface ContractorWithStation {
  id: string;
  name: string;
  tariffRatePerKg: any;
  phone: string | null;
  specialization: string | null;
  isActive: boolean;
  createdAt: Date;
  operationsCount?: number;
  totalOutputKg?: number;
  totalCost?: number;
  stations?: Array<{ id: string; name: string }>;
  station?: {
    id: string;
    name: string;
    location: string;
  } | null;
}

interface ContractorTableProps {
  contractors: ContractorWithStation[];
}

export function ContractorTable({ contractors }: ContractorTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت تأكد من حذف المقاول ${name}؟`)) {
      startTransition(async () => {
        const res = await deleteContractor(id);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.error);
        }
      });
    }
  };

  if (contractors.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <HardHat className="h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">لا يوجد مقاولين مسجلين</h3>
          <p className="text-sm text-gray-500 max-w-sm mt-1">
            قم بإضافة مقاولي الفرز والتجهيز الجدد ومتابعة عملياتهم عبر كافة محطات التشغيل.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">كود المقاول</th>
              <th className="px-6 py-4">اسم المقاول</th>
              <th className="px-6 py-4">التخصص / الخدمات</th>
              <th className="px-6 py-4">نطاق العمل / المحطات النشطة</th>
              <th className="px-6 py-4">تعريفة الفرز والتجهيز</th>
              <th className="px-6 py-4">الهاتف</th>
              <th className="px-6 py-4">الحالة</th>
              <th className="px-6 py-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contractors.map((contractor) => (
              <tr key={contractor.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-gray-900">
                  <Link href={`/contractors/${contractor.id}`} className="hover:text-emerald-700 hover:underline">
                    {contractor.id}
                  </Link>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  <Link href={`/contractors/${contractor.id}`} className="flex items-center gap-2 hover:text-emerald-700">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold">
                      <HardHat className="h-4 w-4" />
                    </div>
                    <span>{contractor.name}</span>
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {contractor.specialization || "فرز وتجهيز عمومي"}
                </td>
                <td className="px-6 py-4">
                  {contractor.stations && contractor.stations.length > 0 ? (
                    <div className="flex flex-wrap gap-1 items-center">
                      {contractor.stations.map((st) => (
                        <Badge key={st.id} variant="outline" className="bg-emerald-50/50 text-emerald-800 border-emerald-200 text-xs">
                          <Building2 className="h-3 w-3 ml-1 text-emerald-600" />
                          {st.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                      متاح لكافة المحطات
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-xs">
                    <DollarSign className="h-3.5 w-3.5" />
                    {Number(contractor.tariffRatePerKg).toFixed(2)} ج.م / كجم
                  </span>
                </td>
                <td className="px-6 py-4 dir-ltr text-right font-mono text-gray-600">
                  {contractor.phone ? (
                    <a
                      href={`tel:${contractor.phone}`}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {contractor.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {contractor.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      نشط
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      معطل
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleDelete(contractor.id, contractor.name)}
                    className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

