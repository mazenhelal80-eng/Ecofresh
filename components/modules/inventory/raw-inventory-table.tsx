"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Truck,
  Phone,
  Search,
  Filter,
  Eye,
  Scale,
  Sparkles,
  Calendar,
  Layers,
  ExternalLink,
  DollarSign,
  Boxes,
  FileCheck2,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { QcStatusBadge } from "./qc-status-badge";
import { formatCurrency } from "@/lib/currency";
import {
  RawMaterialGroup,
  RawMaterialGroupBatch,
  groupRawBatches,
} from "@/types/raw-inventory";

export interface RawBatchWithRelations extends RawMaterialGroupBatch {}

interface RawInventoryTableProps {
  groups?: RawMaterialGroup[];
  lots?: RawBatchWithRelations[];
}

export function RawInventoryTable({
  groups: propGroups,
  lots: propLots,
}: RawInventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStation, setSelectedStation] = useState<string>("ALL");
  const [selectedProduct, setSelectedProduct] = useState<string>("ALL");
  const [selectedQcStatus, setSelectedQcStatus] = useState<string>("ALL");

  // Selected group for Details Drawer / Sheet
  const [activeGroup, setActiveGroup] = useState<RawMaterialGroup | null>(null);

  // Normalize data to groups
  const groups: RawMaterialGroup[] = useMemo(() => {
    if (propGroups && propGroups.length > 0) {
      return propGroups;
    }
    if (propLots && propLots.length > 0) {
      return groupRawBatches(propLots);
    }
    return [];
  }, [propGroups, propLots]);

  // Extract unique stations & products for dropdown filters
  const stationsList = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => {
      if (g.station?.name) {
        map.set(g.station.name, g.station.name);
      }
    });
    return Array.from(map.values()).sort();
  }, [groups]);

  const productsList = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => {
      if (g.rawProduct) {
        map.set(g.rawProduct, g.rawProduct);
      }
    });
    return Array.from(map.values()).sort();
  }, [groups]);

  // Filtered groups calculation
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const searchLower = searchTerm.toLowerCase().trim();

      // Search match: rawProduct, station name, location, or any batchId / supplier name / truckPlate / driverName
      let matchesSearch = !searchTerm;
      if (searchTerm) {
        const matchesGroupHeader =
          g.rawProduct.toLowerCase().includes(searchLower) ||
          (g.station?.name && g.station.name.toLowerCase().includes(searchLower)) ||
          (g.station?.location && g.station.location.toLowerCase().includes(searchLower));

        const matchesSuppliers = g.suppliersList.some((s) =>
          s.name?.toLowerCase().includes(searchLower)
        );

        const matchesInnerBatches = g.batches.some((b) => {
          if (b.batchId.toLowerCase().includes(searchLower)) return true;
          if (b.supplier?.name && b.supplier.name.toLowerCase().includes(searchLower))
            return true;
          if (b.truckPlate && b.truckPlate.toLowerCase().includes(searchLower))
            return true;
          if (b.driverName && b.driverName.toLowerCase().includes(searchLower))
            return true;
          return false;
        });

        matchesSearch = matchesGroupHeader || matchesSuppliers || matchesInnerBatches;
      }

      // Station filter
      const matchesStation =
        selectedStation === "ALL" || g.station?.name === selectedStation;

      // Product filter
      const matchesProduct =
        selectedProduct === "ALL" || g.rawProduct === selectedProduct;

      // QC Status filter: matches if group contains batches with this status
      const matchesQc =
        selectedQcStatus === "ALL" ||
        g.qcStatuses.some((st) => st.toUpperCase() === selectedQcStatus);

      return matchesSearch && matchesStation && matchesProduct && matchesQc;
    });
  }, [groups, searchTerm, selectedStation, selectedProduct, selectedQcStatus]);

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <Card className="border-gray-200 shadow-sm p-4 bg-white">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث برقم اللوط، المحصول، المورد أو السيارة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 pl-3 text-sm"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Station Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <span className="font-semibold text-gray-600">المحطة:</span>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">كل المحطات</option>
                {stationsList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
              <span className="font-semibold text-gray-600">المحصول:</span>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">كل المحاصيل</option>
                {productsList.map((prod) => (
                  <option key={prod} value={prod}>
                    {prod}
                  </option>
                ))}
              </select>
            </div>

            {/* QC Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
              <span className="font-semibold text-gray-600">حالة الجودة:</span>
              <select
                value={selectedQcStatus}
                onChange={(e) => setSelectedQcStatus(e.target.value)}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">كل الحالات</option>
                <option value="APPROVED">مقبول APPROVED</option>
                <option value="REJECTED">مرفوض REJECTED</option>
                <option value="PENDING">قيد الفحص PENDING</option>
              </select>
            </div>

            {/* Reset Filters button if any filter is active */}
            {(selectedStation !== "ALL" ||
              selectedProduct !== "ALL" ||
              selectedQcStatus !== "ALL" ||
              searchTerm) && (
              <button
                onClick={() => {
                  setSelectedStation("ALL");
                  setSelectedProduct("ALL");
                  setSelectedQcStatus("ALL");
                  setSearchTerm("");
                }}
                className="text-xs text-rose-600 hover:underline px-2 py-1 font-semibold"
              >
                إعادة ضبط
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Grouped Table */}
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b font-semibold">
                <tr>
                  <th className="py-3.5 px-4">المحصول الزراعي</th>
                  <th className="py-3.5 px-4">المحطة الحاضنة</th>
                  <th className="py-3.5 px-4 text-center">عدد اللوطات</th>
                  <th className="py-3.5 px-4">الموردين / المزارع</th>
                  <th className="py-3.5 px-4">تاريخ الاستلام</th>
                  <th className="py-3.5 px-4">إجمالي الرصيد المتاح</th>
                  <th className="py-3.5 px-4">تكلفة الكيلو الموزونة</th>
                  <th className="py-3.5 px-4">إجمالي قيمة المخزون</th>
                  <th className="py-3.5 px-4 text-center">مؤشر البريكس والجودة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-500">
                      <Boxes className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      لا توجد مجموعات مواد خام تطابق الفلاتر المحددة حالياً.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group) => {
                    const dateDisplay =
                      group.earliestReceivedDate === group.latestReceivedDate
                        ? group.earliestReceivedDate || "-"
                        : `${group.earliestReceivedDate} إلى ${group.latestReceivedDate}`;

                    return (
                      <tr
                        key={group.groupId}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        {/* 1. Crop / Raw Material */}
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                              <Scale className="h-4 w-4" />
                            </div>
                            <span className="text-base text-gray-950 font-bold">
                              {group.rawProduct}
                            </span>
                          </div>
                        </td>

                        {/* 2. Station & Location */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800 flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                              {group.station?.name}
                            </span>
                            {group.station?.location && (
                              <span className="text-xs text-gray-500 mr-4">
                                {group.station.location}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Batches Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md border border-gray-200">
                            <Layers className="h-3 w-3 text-gray-500" />
                            {group.batchesCount}{" "}
                            {group.batchesCount === 1 ? "لوط" : "لوطات"}
                          </span>
                        </td>

                        {/* 4. Suppliers List / Summary */}
                        <td className="py-3.5 px-4">
                          {group.suppliersList.length === 1 ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800 flex items-center gap-1 text-xs">
                                <Truck className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                                {group.suppliersList[0].name}
                              </span>
                              {group.suppliersList[0].phone && (
                                <span className="text-[11px] text-gray-500 font-mono dir-ltr flex items-center gap-1 mr-4">
                                  <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                                  {group.suppliersList[0].phone}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-cyan-50 text-cyan-900 border-cyan-200 font-bold text-xs gap-1"
                            >
                              <Truck className="h-3 w-3 text-cyan-600" />
                              {group.suppliersList.length} موردين / مزارع
                            </Badge>
                          )}
                        </td>

                        {/* 5. Received Date */}
                        <td className="py-3.5 px-4 text-xs font-mono text-gray-700">
                          <span className="flex items-center gap-1 text-gray-800 font-semibold">
                            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            {dateDisplay}
                          </span>
                        </td>

                        {/* 6. Total Available Quantity */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#012d1d] text-base font-mono">
                              {group.totalAvailableQty.toLocaleString()} كجم
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium">
                              إجمالي الرصيد المتاح
                            </span>
                          </div>
                        </td>

                        {/* 7. Weighted Unit Cost */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-cyan-900 font-mono text-sm">
                              {formatCurrency(group.weightedAverageCost)} / كجم
                            </span>
                            <span className="text-[11px] text-gray-400">
                              متوسط موزون
                            </span>
                          </div>
                        </td>

                        {/* 8. Total Inventory Value */}
                        <td className="py-3.5 px-4 font-bold text-[#0054cd] font-mono text-sm">
                          {formatCurrency(group.totalValue)}
                        </td>

                        {/* 9. Brix Degree & QC */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {group.averageBrix !== null ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold font-mono">
                                <Sparkles className="h-3 w-3 text-amber-600" />
                                {group.averageBrix.toFixed(1)}° Brix
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </td>

                        {/* 10. Action Button */}
                        <td className="py-3.5 px-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveGroup(group)}
                            className="h-8 text-xs font-bold text-cyan-800 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border-cyan-200 gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" /> التفاصيل
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Group Details Drawer (Sheet) */}
      <Sheet open={!!activeGroup} onOpenChange={(open) => !open && setActiveGroup(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl overflow-y-auto p-6 bg-gray-50/50"
        >
          {activeGroup && (
            <div className="space-y-6">
              {/* Drawer Header */}
              <SheetHeader className="text-right border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <SheetTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Scale className="h-5 w-5 text-emerald-700" />
                      {activeGroup.rawProduct}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-gray-500 flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      المحطة الحاضنة: {activeGroup.station?.name}
                      {activeGroup.station?.location &&
                        ` (${activeGroup.station.location})`}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Group KPIs Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-semibold block">
                    إجمالي الرصيد المتاح
                  </span>
                  <p className="text-lg font-bold text-[#012d1d] font-mono mt-1">
                    {activeGroup.totalAvailableQty.toLocaleString()} كجم
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-semibold block">
                    متوسط التكلفة الموزونة
                  </span>
                  <p className="text-lg font-bold text-cyan-900 font-mono mt-1">
                    {formatCurrency(activeGroup.weightedAverageCost)} / كجم
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-semibold block">
                    إجمالي قيمة المخزون
                  </span>
                  <p className="text-lg font-bold text-[#0054cd] font-mono mt-1">
                    {formatCurrency(activeGroup.totalValue)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-semibold block">
                    عدد اللوطات المفتوحة
                  </span>
                  <p className="text-lg font-bold text-purple-900 font-mono mt-1">
                    {activeGroup.batchesCount} لوط
                  </p>
                </div>
              </div>

              {/* Additional Summary Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">
                    الكمية المستلمة الصافية الأولية:
                  </span>
                  <span className="font-bold font-mono text-gray-900 text-sm">
                    {activeGroup.totalInitialQty.toLocaleString()} كجم
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">
                    إجمالي المسحوب لخطوط الإنتاج:
                  </span>
                  <span className="font-bold font-mono text-amber-700 text-sm">
                    {activeGroup.totalConsumedQty.toLocaleString()} كجم
                  </span>
                </div>
              </div>

              {/* Batches Detailed List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-700" />
                    قائمة اللوطات والبيانات الميزانية التفصيلية (
                    {activeGroup.batches.length})
                  </h3>
                  <span className="text-xs text-gray-500">
                    انقر على رقم اللوط لفتح بطاقة الفحص والميزان الكاملة
                  </span>
                </div>

                <div className="space-y-3">
                  {activeGroup.batches.map((batch) => {
                    const recDate = batch.receivedDate
                      ? new Date(batch.receivedDate).toISOString().split("T")[0]
                      : "-";
                    const initialNet = Number(batch.initialQty || 0);
                    const available = Number(batch.availableQty || 0);
                    const consumed = Math.max(0, initialNet - available);
                    const unitCost = Number(batch.unitCost || 0);
                    const brix = batch.brixDegree != null ? Number(batch.brixDegree) : null;

                    return (
                      <Card
                        key={batch.batchId}
                        className="bg-white border-gray-200 shadow-sm overflow-hidden hover:border-emerald-300 transition-colors"
                      >
                        {/* Batch Header Bar */}
                        <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/inventory/raw/${batch.batchId}`}
                              className="font-mono font-bold text-sm text-[#012d1d] hover:underline flex items-center gap-1"
                              title="فتح بطاقة اللوط وتقرير فحص الجودة"
                            >
                              <Scale className="h-4 w-4 text-emerald-700 shrink-0" />
                              {batch.batchId}
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            </Link>

                            <QcStatusBadge status={batch.qcStatus} />
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-600 font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              استلام: {recDate}
                            </span>
                            {brix !== null && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                                <Sparkles className="h-3 w-3 text-amber-600" />
                                {brix}° Brix
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Batch Body Grid */}
                        <CardContent className="p-4 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-gray-500 block font-medium">
                                الرصيد المتاح
                              </span>
                              <span className="font-bold text-[#012d1d] font-mono text-sm block mt-0.5">
                                {available.toLocaleString()} كجم
                              </span>
                              <span className="text-[10px] text-gray-400">
                                استلام {initialNet.toLocaleString()} كجم
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-500 block font-medium">
                                المسحوب للإنتاج
                              </span>
                              <span className="font-bold text-amber-700 font-mono text-sm block mt-0.5">
                                {consumed.toLocaleString()} كجم
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-500 block font-medium">
                                تكلفة الكيلو
                              </span>
                              <span className="font-bold text-cyan-900 font-mono text-sm block mt-0.5">
                                {formatCurrency(unitCost)} / كجم
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-500 block font-medium">
                                إجمالي قيمة اللوط المتاح
                              </span>
                              <span className="font-bold text-[#0054cd] font-mono text-sm block mt-0.5">
                                {formatCurrency(available * unitCost)}
                              </span>
                            </div>
                          </div>

                          {/* Supplier & Logistics Details */}
                          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 bg-gray-50 rounded-lg space-y-1">
                              <span className="text-gray-500 font-medium block">
                                المورد / المزرعة:
                              </span>
                              <span className="font-bold text-gray-900 flex items-center gap-1">
                                <Truck className="h-3.5 w-3.5 text-cyan-700" />
                                {batch.supplier?.name}
                              </span>
                              {batch.supplier?.phone && (
                                <span className="text-[11px] text-gray-600 font-mono dir-ltr block">
                                  📞 {batch.supplier.phone}
                                </span>
                              )}
                            </div>

                            <div className="p-2.5 bg-gray-50 rounded-lg space-y-1">
                              <span className="text-gray-500 font-medium block">
                                وسيلة النقل والسائق:
                              </span>
                              <span className="font-mono font-bold text-gray-800 block">
                                {batch.truckPlate ? `🚗 ${batch.truckPlate}` : "غير مسجل"}
                              </span>
                              {batch.driverName && (
                                <span className="text-gray-600 text-[11px] block">
                                  السائق: {batch.driverName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Weighbridge summary */}
                          <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-gray-600">
                            <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                              قائم: {batch.grossQtyKg.toLocaleString()} كجم
                            </span>
                            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                              فارغ: {batch.tareQtyKg.toLocaleString()} كجم
                            </span>
                            <span className="bg-cyan-50 text-cyan-900 px-2 py-0.5 rounded border border-cyan-200">
                              صافي: {initialNet.toLocaleString()} كجم
                            </span>
                          </div>

                          {/* Notes if available */}
                          {batch.notes && (
                            <div className="pt-2 text-xs flex items-center gap-1.5 text-amber-900 bg-amber-50/60 p-2 rounded border border-amber-100">
                              <Info className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                              <span>ملاحظات: {batch.notes}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

