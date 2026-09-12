"use client";

import { Check, X, Shield, Lock, Eye, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MatrixRow {
  module: string;
  category: string;
  ownerAccess: string;
  accountantAccess: string;
  accountantAllowed: boolean | "partial";
  notes?: string;
}

const MATRIX_DATA: MatrixRow[] = [
  // User & System
  {
    module: "إدارة المستخدمين والأدوار",
    category: "النظام والإعدادات",
    ownerAccess: "كامل (إنشاء، تعديل، تعطيل، إعادة تعيين كلمة المرور)",
    accountantAccess: "محظور تماماً",
    accountantAllowed: false,
    notes: "لا يمكن للمحاسب فتح صفحة المستخدمين أو تعديل أي صلاحيات",
  },
  {
    module: "إعدادات النظام العامة",
    category: "النظام والإعدادات",
    ownerAccess: "كامل",
    accountantAccess: "محظور تماماً",
    accountantAllowed: false,
  },
  // Financials & Treasury
  {
    module: "الماليات والأستاذ العام (Ledger)",
    category: "المالية والخزينة",
    ownerAccess: "كامل (عرض، قيود، تسويات)",
    accountantAccess: "كامل (عرض، قيود، تسويات، إلغاء معتمد)",
    accountantAllowed: true,
  },
  {
    module: "كشوف الحسابات التفصيلية",
    category: "المالية والخزينة",
    ownerAccess: "كامل",
    accountantAccess: "كامل لكافة الجهات والعملاء والموردين",
    accountantAllowed: true,
  },
  {
    module: "سندات القبض والصرف (Vouchers)",
    category: "المالية والخزينة",
    ownerAccess: "كامل",
    accountantAccess: "كامل (إصدار سندات، تسجيل المصروفات)",
    accountantAllowed: true,
  },
  {
    module: "الخزينة والحسابات البنكية",
    category: "المالية والخزينة",
    ownerAccess: "كامل",
    accountantAccess: "كامل (إدارة الأرصدة والتحويلات البنكية)",
    accountantAllowed: true,
  },
  {
    module: "التقارير المالية والربحية",
    category: "التقارير والتحليلات",
    ownerAccess: "كامل لكافة تقارير النظام",
    accountantAccess: "التقارير المالية وربحية الشحنات وكشوف الحسابات",
    accountantAllowed: true,
  },
  // Master data & Partners
  {
    module: "دليل عملاء التصدير",
    category: "البيانات الأساسية",
    ownerAccess: "كامل (إضافة، تعديل، اتفاقيات أسعار)",
    accountantAccess: "عرض مالي (كشف حساب، مديونيات، تحصيلات)",
    accountantAllowed: "partial",
    notes: "لأغراض المتابعة المالية فقط",
  },
  {
    module: "دليل الموردين",
    category: "البيانات الأساسية",
    ownerAccess: "كامل (إضافة، تعديل، اعتمادات)",
    accountantAccess: "عرض مالي (كشف حساب، مستحقات، سدادات)",
    accountantAllowed: "partial",
    notes: "لأغراض المتابعة المالية فقط",
  },
  {
    module: "مشتريات الخامات والمستلزمات",
    category: "العمليات والمشتريات",
    ownerAccess: "كامل (استلام خامات، فحص جودة، تسعير)",
    accountantAccess: "عرض مالي (فواتير، استحقاقات، دفعات)",
    accountantAllowed: "partial",
    notes: "لا يمكنه إنشاء استلام خامات أو تعديل كميات المستودع",
  },
  {
    module: "الشحنات والتصدير",
    category: "العمليات والمشتريات",
    ownerAccess: "كامل (تجهيز، حجز، فواتير، تتبع)",
    accountantAccess: "عرض مالي ومتابعة مستحقات الشحنة والربحية",
    accountantAllowed: "partial",
    notes: "لا يمكنه ترحيل الشحنات أو صرف بضاعة المخزن",
  },
  // Operations & Inventory
  {
    module: "المحطات والمخازن ومواقع التخزين",
    category: "التشغيل والمخازن",
    ownerAccess: "كامل (إضافة محطات، تهيئة غرف التبريد)",
    accountantAccess: "محظور تماماً",
    accountantAllowed: false,
    notes: "تشغيلي بحت",
  },
  {
    module: "عمليات التدوير والإنتاج والفرز",
    category: "التشغيل والمخازن",
    ownerAccess: "كامل (بدء تشغيل، إقفال خطوط، نسب هالك)",
    accountantAccess: "محظور تماماً",
    accountantAllowed: false,
    notes: "تشغيلي بحت",
  },
  {
    module: "حركات المخزون والتحويل بين المحطات",
    category: "التشغيل والمخازن",
    ownerAccess: "كامل (نقل، تسوية جردية)",
    accountantAccess: "محظور تماماً",
    accountantAllowed: false,
    notes: "لا يسمح للمحاسب بإنشاء StockMovements يدوياً",
  },
  {
    module: "مقاولو العمالة والتشغيل",
    category: "التشغيل والمخازن",
    ownerAccess: "كامل (تعاقدات، تسعير إنتاجية، تشغيل)",
    accountantAccess: "محظور تشغيلياً (يتابع حساباتهم من الدفتر فقط)",
    accountantAllowed: false,
  },
  {
    module: "اتفاقيات الأسعار وطلبيات التصدير",
    category: "التشغيل والمخازن",
    ownerAccess: "كامل",
    accountantAccess: "محظور تشغيلياً",
    accountantAllowed: false,
  },
];

export function RolesMatrixTab() {
  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#012d1d]" />
            مصفوفة الصلاحيات والأدوار (RBAC Matrix)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            مقارنة دقيقة وموثقة للصلاحيات الممنوحة لكل من مالك النظام (OWNER) والمحاسب المالي (ACCOUNTANT).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-950 text-white font-bold text-xs px-3 py-1">
            OWNER: وصول كامل
          </Badge>
          <Badge variant="outline" className="border-blue-300 text-blue-800 bg-blue-50 font-bold text-xs px-3 py-1">
            ACCOUNTANT: نطاق مالي محكم
          </Badge>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-700 font-bold">
            <tr>
              <th className="p-3 w-1/4">الوحدة / القسم</th>
              <th className="p-3 w-1/6">التصنيف</th>
              <th className="p-3 w-1/4 text-emerald-900">صلاحيات OWNER (المالك)</th>
              <th className="p-3 w-1/3 text-blue-900">صلاحيات ACCOUNTANT (المحاسب)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MATRIX_DATA.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-800 shrink-0" />
                  {row.module}
                </td>
                <td className="p-3">
                  <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                    {row.category}
                  </span>
                </td>
                <td className="p-3 text-emerald-950 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{row.ownerAccess}</span>
                  </div>
                </td>
                <td className="p-3">
                  {row.accountantAllowed === true ? (
                    <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{row.accountantAccess}</span>
                    </div>
                  ) : row.accountantAllowed === "partial" ? (
                    <div className="flex items-start gap-1.5 text-amber-900">
                      <Eye className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">{row.accountantAccess}</div>
                        {row.notes && <div className="text-[10px] text-gray-500">{row.notes}</div>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-600 font-semibold">
                      <Lock className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{row.accountantAccess}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
