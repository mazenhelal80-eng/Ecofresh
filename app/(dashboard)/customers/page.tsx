import Link from "next/link";
import { Users, Plus, Globe, CreditCard, DollarSign } from "lucide-react";
import { getCustomersPaginated } from "@/actions/customers";
import { CustomerTable } from "@/components/modules/customers/customer-table";
import { PaginationControls } from "@/components/modules/common/pagination-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

export const metadata = {
  title: "دليل العملاء والاتفاقيات | EcoFresh",
};

interface CustomersPageProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const currentPage = Number(searchParams?.page) || 1;
  const search = searchParams?.search;

  const { customers, totalCount, totalPages, pageSize, stats } = await getCustomersPaginated(
    currentPage,
    25,
    search
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#012d1d] text-white shadow-sm">
            <Users className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">دليل عملاء التصدير والاتفاقيات</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              إدارة العملاء الدوليين، موانئ الوصول، والأسعار التعاقدية للمنتجات
            </p>
          </div>
        </div>
        <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 font-semibold shadow-sm w-full sm:w-auto">
  <Link href="/customers/new">
            <Plus className="h-4 w-4" /> إضافة عميل تصدير جديد
          </Link>
</Button>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي عملاء التصدير</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalCustomers} عملاء
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                العملة المعتمدة: الجنيه المصري (EGP)
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي حدود الائتمان</p>
              <p className="text-2xl font-bold text-[#012d1d] mt-1">
                {formatCurrency(stats.totalCreditLimitEur)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">إجمالي اتفاقيات الأسعار</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {stats.totalAgreementsCount} اتفاقية
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Customer Table Component */}
      <CustomerTable customers={customers} />

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  );
}
