"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  Trash2,
  Box,
  Package,
  Layers,
  ArrowLeft,
  AlertTriangle,
  History,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteStation } from "@/actions/stations";
import { toast } from "sonner";

interface StationCardProps {
  station: {
    id: string;
    name: string;
    location: string;
    coldStorageCapacityKg: number | any;
    electricityRatePerKg: any;
    supervisorName?: string | null;
    phone?: string | null;
    isActive: boolean;
    rawStockKg?: number;
    fgStockKg?: number;
    suppliesStockQty?: number;
    totalStockKg?: number;
    rawLotsCount?: number;
    fgBatchesCount?: number;
    suppliesItemsCount?: number;
    distinctProductsCount?: number;
    alertsCount?: number;
    lastMovement?: {
      movementNo: string;
      movementType: string;
      createdAt: string;
      qty: number;
      unit: string;
    } | null;
  };
}

function formatRelativeTime(isoDateString?: string | null): string {
  if (!isoDateString) return "لا توجد حركات بعد";
  const date = new Date(isoDateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "منذ ثوانٍ";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "أمس";
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  return date.toLocaleDateString("ar-EG");
}

export function StationCard({ station }: StationCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف أو أرشفة المحطة ${station.name}؟`)) {
      startTransition(async () => {
        const res = await deleteStation(station.id);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.error);
        }
      });
    }
  };

  const rawKg = station.rawStockKg || 0;
  const fgKg = station.fgStockKg || 0;
  const suppliesQty = station.suppliesStockQty || 0;
  const totalStock = station.totalStockKg ?? (rawKg + fgKg);
  const alertsCount = station.alertsCount || 0;
  const distinctCount = station.distinctProductsCount || 0;

  return (
    <Link href={`/stations/${station.id}`} className="block group">
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-emerald-300 border-gray-200 flex flex-col h-full bg-white">
        {/* Header Section */}
        <CardHeader className="bg-gradient-to-r from-emerald-50/70 to-teal-50/70 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#012d1d] text-white shadow-2xs group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-gray-900 group-hover:text-emerald-900 transition-colors">
                  {station.name}
                </CardTitle>
                <span className="text-xs text-gray-500 font-mono font-semibold">{station.id}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={station.isActive ? "default" : "secondary"}
                className={
                  station.isActive
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                    : "bg-gray-100 text-gray-600"
                }
              >
                {station.isActive ? (
                  <span className="flex items-center gap-1 font-semibold text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> نشطة
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold text-[11px]">
                    <XCircle className="h-3 w-3 text-gray-500" /> غير نشطة
                  </span>
                )}
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={handleDelete}
                className="text-gray-400 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0"
                title="إيقاف أو حذف المحطة"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Card Body */}
        <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
          {/* Quick Metrics Grid (Raw, FG, Supplies) */}
          <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-200/70 text-center font-mono">
            {/* RAW Location */}
            <div className="bg-amber-50/80 border border-amber-200/70 rounded-lg p-2 flex flex-col items-center">
              <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1 font-sans">
                <Box className="h-3 w-3 text-amber-600" /> الخام
              </span>
              <span className="text-xs font-black text-amber-950 mt-1">
                {rawKg.toLocaleString()} <span className="text-[9px] font-normal font-sans text-amber-800">كجم</span>
              </span>
              {station.rawLotsCount !== undefined && (
                <span className="text-[10px] text-amber-700 font-sans mt-0.5">
                  {station.rawLotsCount} لوط
                </span>
              )}
            </div>

            {/* FINISHED Location */}
            <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-lg p-2 flex flex-col items-center">
              <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 font-sans">
                <Package className="h-3 w-3 text-emerald-600" /> الجاهز
              </span>
              <span className="text-xs font-black text-emerald-950 mt-1">
                {fgKg.toLocaleString()} <span className="text-[9px] font-normal font-sans text-emerald-800">كجم</span>
              </span>
              {station.fgBatchesCount !== undefined && (
                <span className="text-[10px] text-emerald-700 font-sans mt-0.5">
                  {station.fgBatchesCount} باتش
                </span>
              )}
            </div>

            {/* SUPPLIES Location */}
            <div className="bg-cyan-50/80 border border-cyan-200/70 rounded-lg p-2 flex flex-col items-center">
              <span className="text-[10px] font-bold text-cyan-800 flex items-center gap-1 font-sans">
                <Layers className="h-3 w-3 text-cyan-600" /> المستلزمات
              </span>
              <span className="text-xs font-black text-cyan-950 mt-1">
                {suppliesQty.toLocaleString()} <span className="text-[9px] font-normal font-sans text-cyan-800">وحدة</span>
              </span>
              {station.suppliesItemsCount !== undefined && (
                <span className="text-[10px] text-cyan-700 font-sans mt-0.5">
                  {station.suppliesItemsCount} صنف
                </span>
              )}
            </div>
          </div>

          {/* Quick Info Attributes */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-600">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" /> الموقع:
              </span>
              <span className="font-semibold text-gray-800">{station.location}</span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Activity className="h-3.5 w-3.5 text-indigo-600" /> عدد الأصناف بالمحطة:
              </span>
              <span className="font-bold font-mono text-gray-900">{distinctCount} أصناف</span>
            </div>

            <div className="flex items-center justify-between text-gray-600">
              <span className="flex items-center gap-1.5 font-medium">
                <History className="h-3.5 w-3.5 text-blue-600" /> آخر حركة:
              </span>
              <span className="font-semibold text-gray-700">
                {formatRelativeTime(station.lastMovement?.createdAt)}
              </span>
            </div>
          </div>

          {/* Alerts Banner if present */}
          {alertsCount > 0 ? (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-amber-900 text-[11px] font-semibold">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>يوجد {alertsCount} تنبيهات تشغيلية بحاجة للمراجعة</span>
              </div>
            </div>
          ) : (
            <div className="p-2 bg-emerald-50/60 border border-emerald-200/60 rounded-lg flex items-center justify-between text-emerald-900 text-[11px] font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>حالة التشغيل والأرصدة طبيعية</span>
              </div>
            </div>
          )}

          {/* Action Button leading to Station Control Center */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 font-sans">
              إجمالي المخزون: <strong className="text-[#012d1d] font-mono">{totalStock.toLocaleString()} كجم</strong>
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#012d1d] group-hover:text-emerald-700 transition-colors">
              مركز التحكم بالمحطة
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
