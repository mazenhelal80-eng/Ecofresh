import React from "react";
import Link from "next/link";
import { getContractors } from "@/actions/contractors";
import { ContractorTable } from "@/components/modules/contractors/contractor-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, HardHat, Building2, DollarSign, Calculator } from "lucide-react";

import { requirePagePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ContractorsPage() {
  await requirePagePermission('contractors.view');
  const contractors = await getContractors();

  const totalContractors = contractors.length;
  const activeContractors = contractors.filter((c) => c.isActive).length;
  const avgTariff =
    totalContractors > 0
      ? (
          contractors.reduce((acc, c) => acc + Number(c.tariffRatePerKg), 0) /
          totalContractors
        ).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مقاولو العمالة وتعريفات التشغيل</h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة مقاولي فرز وتجهيز وتجميد الحاصلات الزراعية، وربط المقاولين بمحطات العمل وتحديد تعريفة الكيلوجرام.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
  <Link href="/contractors/new">
            <Plus className="h-4 w-4" />
            إضافة مقاول جديد
          </Link>
</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              إجمالي المقاولين المسجلين
            </CardTitle>
            <HardHat className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalContractors} مقاولين</div>
            <p className="mt-1 text-xs text-gray-500">
              {activeContractors} مقاولين نشطين في الخدمة
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              متوسط تعريفة الفرز
            </CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{avgTariff} ج.م / كجم</div>
            <p className="mt-1 text-xs text-gray-500">
              معدل التكلفة لكل كيلوجرام جاهز
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              محطات التشغيل المغطاة
            </CardTitle>
            <Building2 className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {new Set(contractors.flatMap((c) => (c.stations || []).map((s) => s.id))).size} محطات
            </div>
            <p className="mt-1 text-xs text-gray-500">
              شهدت عمليات فرز وتجهيز بمقاولين
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <ContractorTable contractors={contractors} />
    </div>
  );
}
