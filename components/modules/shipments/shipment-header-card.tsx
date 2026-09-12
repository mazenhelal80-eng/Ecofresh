import React from "react";
import Link from "next/link";
import { ShipmentTraceabilityData } from "@/lib/data/shipment-dna";
import {
  Truck,
  Anchor,
  ShieldCheck,
  ThermometerSnowflake,
  Package,
  Calendar,
  User,
  FileText,
} from "lucide-react";

interface ShipmentHeaderCardProps {
  shipment: ShipmentTraceabilityData;
}

export function ShipmentHeaderCard({ shipment }: ShipmentHeaderCardProps) {
  const dispatchDateFormatted = shipment.dispatchDate
    ? new Date(shipment.dispatchDate).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "غير محدد";

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      {/* Top Section: Title & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-800 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 border border-emerald-200 shadow-sm">
            <Anchor className="w-7 h-7 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 font-mono dir-ltr text-right">
                #{shipment.shipmentId}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                {shipment.status || "تم الشحن والإبحار"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-600" />
                سلسلة التبريد: -18°م
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
                العميل:{" "}
                <Link
                  href={`/customers/${shipment.customerId}`}
                  className="font-bold text-emerald-900 hover:underline"
                >
                  {shipment.customer.name}
                </Link>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                المنتج: <strong className="font-bold text-gray-800">{shipment.productName}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                تاريخ الإبحار: <strong className="font-mono">{dispatchDateFormatted}</strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/client-orders?orderId=${shipment.orderId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 transition-colors"
          >
            <FileText className="w-4 h-4 text-gray-500" />
            الطلبية {shipment.orderId}
          </Link>

          <a
            href={`/api/export/pdf/invoice/${shipment.shipmentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl border border-emerald-200 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            تحميل الفاتورة التجارية (PDF)
          </a>

          <a
            href={`/api/export/pdf/certificate/${shipment.shipmentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl border border-blue-200 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            شهادة التتبع الجمركية (PDF)
          </a>
        </div>
      </div>

      {/* Logistics & Shipping Container Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            رقم الحاوية البحرية
          </span>
          <div className="text-base font-bold font-mono text-gray-900 dir-ltr text-right">
            {shipment.containerNo}
          </div>
          <span className="text-[10px] text-gray-400 block">MSKU / Reeves Spec</span>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            رقم الختم الجمركي
          </span>
          <div className="text-base font-bold font-mono text-gray-900 dir-ltr text-right">
            {shipment.sealNo}
          </div>
          <span className="text-[10px] text-gray-400 block">EG-CUS Custom Seal</span>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Anchor className="w-3.5 h-3.5 text-indigo-600" />
            الخط الملاحي الناقل
          </span>
          <div className="text-sm font-bold text-gray-900 truncate">
            {shipment.shippingLine}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            الوزن المشحون المعتمد
          </span>
          <div className="text-base font-bold font-mono text-emerald-800 dir-ltr text-right">
            {Number(shipment.shippedQtyKg).toLocaleString()} <span className="text-xs font-normal">KG</span>
          </div>
          <span className="text-[10px] text-gray-400 block">
            الحجز: {shipment.bookingNo || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}
