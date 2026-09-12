import React from "react";
import { ContractorForm } from "@/components/modules/contractors/contractor-form";

export const dynamic = "force-dynamic";

export default async function NewContractorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إضافة مقاول جديد</h1>
        <p className="text-sm text-gray-500 mt-1">
          تسجيل بيانات مقاول الفرز والتجهيز وتعريفة الأتعاب لكل كجم (يعمل عبر كافة المحطات حسب العمليات).
        </p>
      </div>

      <ContractorForm />
    </div>
  );
}
