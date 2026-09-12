export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Scale,
  Building2,
  Truck,
  Phone,
  Calendar,
  Sparkles,
  UserCheck,
  FileCheck2,
  DollarSign,
  Info,
} from "lucide-react";
import { getRawBatchById } from "@/lib/data/raw-inventory";
import { QcStatusBadge } from "@/components/modules/inventory/qc-status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "بطاقة اللوط وتقرير فحص الجودة | EcoFresh",
};

interface BatchDetailsPageProps {
  params: {
    batchId: string;
  };
}

export default async function BatchDetailsPage({ params }: BatchDetailsPageProps) {
  const batch = await getRawBatchById(params.batchId);

  if (!batch) {
    notFound();
  }

  const initialNet = Number(batch.initialQty || 0);
  const available = Number(batch.availableQty || 0);
  const consumed = Math.max(0, initialNet - available);
  const gross = Number(batch.grossQtyKg || 0);
  const tare = Number(batch.tareQtyKg || 0);
  const unitPrice = Number(batch.unitPriceEgp || 0);
  const transportCost = Number(batch.transportCostEgp || 0);
  const unitCost = Number(batch.unitCost || 0);
  const totalPayable = Number(batch.totalPayableEgp || 0);
  const brix = batch.brixDegree != null ? Number(batch.brixDegree) : null;

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm" className="gap-2 text-gray-700">
  <Link href="/inventory/raw">
            <ArrowRight className="h-4 w-4" /> العودة لمخزن المواد الخام
          </Link>
</Button>
        <QcStatusBadge status={batch.qcStatus} />
      </div>

      {/* Main Banner Card */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#012d1d] to-emerald-900 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl font-bold text-white font-mono">
                    {batch.batchId}
                  </CardTitle>
                  <Badge className="bg-emerald-800 text-emerald-100 border-emerald-700 font-bold">
                    {batch.rawProduct}
                  </Badge>
                </div>
                <CardDescription className="text-emerald-100 text-xs mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-cyan-300" /> المحطة: {batch.station?.name}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-amber-300" /> تاريخ الاستلام:{" "}
                    {new Date(batch.receivedDate).toLocaleDateString("ar-EG")}
                  </span>
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-lg border border-white/20">
              <Sparkles className="h-5 w-5 text-amber-300 shrink-0" />
              <div className="flex flex-col text-right">
                <span className="text-xs text-emerald-200 font-semibold">مؤشر السكر البريكس</span>
                <span className="text-lg font-bold text-white font-mono">
                  {brix !== null ? `${brix}° Brix` : "غير مسجل"}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Quantities & Financial Summary Bar */}
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/60">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">الكمية الأولية الصافية</span>
            <span className="text-xl font-bold text-gray-900 mt-1 block">
              {initialNet.toLocaleString()} كجم
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">الرصيد المتاح حالياً</span>
            <span className="text-xl font-bold text-emerald-800 mt-1 block">
              {available.toLocaleString()} كجم
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">المسحوب للإنتاج</span>
            <span className="text-xl font-bold text-amber-700 mt-1 block">
              {consumed.toLocaleString()} كجم
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs text-gray-500 font-semibold block">تكلفة الكيلو الموزونة</span>
            <span className="text-xl font-bold text-cyan-900 mt-1 block">
              {unitCost.toFixed(2)} ج.م / كجم
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Section: Quality Control Report & Supplier/Logistics Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Quality Control Report Card */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-700" />
              <CardTitle className="text-base font-bold text-gray-900">
                تقرير فحص الجودة معايير القبول (QC Report)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <span className="text-sm font-semibold text-gray-700">قرار لجنة فحص الجودة:</span>
              <QcStatusBadge status={batch.qcStatus} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block">درجة البريكس (Brix)</span>
                <span className="text-base font-bold text-gray-900 mt-0.5 block">
                  {brix !== null ? `${brix}° Brix` : "لم يتم تسجيل قياس البريكس"}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block">المحصول المستلم</span>
                <span className="text-base font-bold text-emerald-800 mt-0.5 block">
                  {batch.rawProduct}
                </span>
              </div>
            </div>

            {batch.notes && (
              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-lg space-y-1">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-amber-700" /> ملاحظات الجودة والاستلام:
                </span>
                <p className="text-sm text-amber-950 font-medium">{batch.notes}</p>
              </div>
            )}

            {batch.createdBy && (
              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span>تم التسجيل بواسطة: <strong className="text-gray-800">{batch.createdBy.fullName}</strong> ({batch.createdBy.role})</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Supplier, Logistics & Financial Details */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-cyan-700" />
              <CardTitle className="text-base font-bold text-gray-900">
                بيانات المورد والشحن والميزان
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Supplier details */}
            <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">المورد / المزرعة:</span>
                <Badge variant="outline" className="bg-white text-gray-800 font-mono text-xs">
                  {batch.supplier?.id}
                </Badge>
              </div>
              <p className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-700" /> {batch.supplier?.name}
              </p>
              {batch.supplier?.phone && (
                <p className="text-xs text-gray-600 flex items-center gap-1 font-mono dir-ltr">
                  <Phone className="h-3.5 w-3.5 text-gray-400" /> {batch.supplier.phone}
                </p>
              )}
            </div>

            {/* Logistics & Weighing details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block">رقم لوحة السيارة</span>
                <span className="text-sm font-bold font-mono text-gray-900 mt-0.5 block">
                  {batch.truckPlate || "غير مسجل"}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block">اسم السائق</span>
                <span className="text-sm font-bold text-gray-900 mt-0.5 block">
                  {batch.driverName || "غير مسجل"}
                </span>
              </div>
            </div>

            {/* Weighbridge Weights */}
            <div className="p-3 bg-emerald-50/40 rounded-lg border border-emerald-100 text-xs space-y-1.5">
              <span className="font-bold text-emerald-950 block">تفاصيل ميزان البسكول:</span>
              <div className="grid grid-cols-3 gap-2 font-mono text-gray-700 text-center">
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <span className="block text-gray-500 text-[10px]">الوزن القائم</span>
                  <strong className="text-gray-900 text-xs">{gross.toLocaleString()} كجم</strong>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <span className="block text-gray-500 text-[10px]">وزن الفارغ</span>
                  <strong className="text-gray-900 text-xs">{tare.toLocaleString()} كجم</strong>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <span className="block text-emerald-700 text-[10px]">الوزن الصافي</span>
                  <strong className="text-emerald-900 text-xs">{initialNet.toLocaleString()} كجم</strong>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="p-3.5 bg-cyan-50/40 rounded-lg border border-cyan-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-cyan-700" />
                <div>
                  <span className="text-xs font-semibold text-cyan-900 block">إجمالي استحقاق المورد</span>
                  <span className="text-xs text-gray-500">
                    سعر الكيلو الأساسي {unitPrice.toFixed(2)} + النولون {transportCost.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
              <span className="text-lg font-bold text-cyan-950 font-mono">
                {totalPayable.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ج.م
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
