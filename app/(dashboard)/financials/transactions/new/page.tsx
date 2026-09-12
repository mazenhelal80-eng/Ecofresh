import React from "react";
import { getVoucherFormData } from "@/actions/financials";
import { VoucherForm } from "@/components/modules/financials/voucher-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "إصدار سند مالي جديد | EcoFresh",
};

export default async function NewVoucherPage() {
  const formData = await getVoucherFormData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          إصدار سند مالي جديد (قبض / صرف)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          قيد سندات تحصيل المبيعات وسداد الموردين والمقاولين وتحديث رصيد الحساب المالي مع الحماية ضد السحب المكشوف.
        </p>
      </div>

      <VoucherForm
        treasuryAccounts={formData.treasuryAccounts}
        customers={formData.customers}
        suppliers={formData.suppliers}
        contractors={formData.contractors}
      />
    </div>
  );
}
