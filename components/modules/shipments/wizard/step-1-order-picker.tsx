"use client";

import React from "react";
import { ClientOrder, Customer } from "@prisma/client";
import { Receipt, CheckCircle2, Lock, Globe, Ship, DollarSign } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";

type ExtendedClientOrder = ClientOrder & {
  customer: Customer;
};

interface Step1OrderPickerProps {
  clientOrders: ExtendedClientOrder[];
  selectedOrderId: string;
  dispatchDate?: string;
  notes?: string;
  onOrderSelect: (orderId: string) => void;
  onChange: (fields: Partial<{ dispatchDate: string; notes: string }>) => void;
  errors?: Record<string, string[]>;
}

export function Step1OrderPicker({
  clientOrders,
  selectedOrderId,
  dispatchDate,
  notes,
  onOrderSelect,
  onChange,
  errors = {},
}: Step1OrderPickerProps) {
  const selectedOrder = clientOrders.find((o) => o.orderId === selectedOrderId);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <h3 className="font-bold text-base text-[#012d1d] flex items-center gap-2">
          <Receipt className="h-5 w-5 text-[#012d1d]" />
          <span>1. اختيار طلبية العميل المعتمدة (Customer Order)</span>
        </h3>
        <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
          <Lock className="h-3.5 w-3.5" />
          بيانات التعاقد مسحوبة آلياً
        </span>
      </div>

      {/* Select Order Dropdown & Dispatch Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="font-bold text-gray-800 text-xs">
            اختر الطلبية المفتوحة *
          </Label>
          <select
            value={selectedOrderId}
            onChange={(e) => onOrderSelect(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-bold font-mono text-[#012d1d] focus:ring-2 focus:ring-[#012d1d] focus:border-transparent outline-none transition-all"
          >
            <option value="">-- اختر طلبية التصدير --</option>
            {clientOrders
              .filter((order) => Number(order.unfulfilledQtyKg) > 0 || order.orderId === selectedOrderId)
              .map((order) => (
                <option key={order.orderId} value={order.orderId}>
                  {order.orderId} - {order.customer.name} ({order.productName} - متبقي: {Number(order.unfulfilledQtyKg).toLocaleString()} كجم)
                </option>
              ))}
          </select>
          {errors.orderId && (
            <p className="text-xs text-red-600 font-semibold mt-1">
              {errors.orderId[0]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="font-bold text-gray-800 text-xs">تاريخ الشحن والتحميل المتوقع</Label>
          <Input
            type="date"
            value={dispatchDate || ""}
            onChange={(e) => onChange({ dispatchDate: e.target.value })}
            className="bg-white border-gray-300 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Selected Order Commercial Snapshot Card */}
      {selectedOrder ? (
        <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm text-[#012d1d]">
                مستند الطلبية: <span className="font-mono font-bold text-blue-700">{selectedOrder.orderId}</span>
              </span>
            </div>
            <span className="text-xs text-gray-600 font-mono">
              عميل: {selectedOrder.customer.name} ({selectedOrder.customer.code})
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono pt-2 border-t border-emerald-100">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-sans">المنتج المتعاقد عليه</span>
              <strong className="text-xs text-[#012d1d] font-sans font-bold">{selectedOrder.productName}</strong>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-sans flex items-center gap-1">
                <Globe className="h-3 w-3" /> دولة العميل
              </span>
              <strong className="text-xs text-gray-800 font-sans font-bold">
                {selectedOrder.customer.country}
              </strong>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-sans flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> سعر البيع بالعقد
              </span>
              <strong className="text-xs text-emerald-700 font-bold">
                {formatCurrency(Number(selectedOrder.unitPriceEur))} / كجم
              </strong>
              <span className="text-[10px] text-gray-500 block">
                العملة: الجنيه المصري (EGP)
              </span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-[11px] text-gray-500 block font-sans">مواصفة التعبئة</span>
              <strong className="text-xs text-blue-700 font-bold block truncate">
                {selectedOrder.packagingSpec}
              </strong>
            </div>
          </div>

          {/* Unfulfilled Quantity Balance Indicator Bar */}
          <div className="bg-white p-3.5 rounded-lg border border-emerald-200 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-gray-700 font-sans">رصيد الطلبية المتبقي للشحن:</span>
              <span className="font-mono text-[#012d1d]">
                المتبقي <span className="text-amber-700 text-sm font-bold">{Number(selectedOrder.unfulfilledQtyKg).toLocaleString()}</span> كجم من إجمالي <span className="text-gray-600">{Number(selectedOrder.orderedQtyKg).toLocaleString()}</span> كجم
              </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      ((Number(selectedOrder.orderedQtyKg) - Number(selectedOrder.unfulfilledQtyKg)) /
                        Number(selectedOrder.orderedQtyKg)) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs">
          <Ship className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          اختر طلبية من القائمة المنسدلة أعلاه لعرض التفاصيل التجارية ورصيد التصدير المتبقي.
        </div>
      )}
    </div>
  );
}
