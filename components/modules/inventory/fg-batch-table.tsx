"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Package,
  Search,
  Filter,
  Eye,
  Calendar,
  Layers,
  ShoppingBag,
  Scale,
  DollarSign,
  Dna,
  CheckCircle2,
  FileText,
  Boxes,
  ExternalLink,
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
import { BatchDnaBadge, SupplierShare } from "./batch-dna-badge";
import { formatCurrency } from "@/lib/currency";
import {
  FinishedGoodsGroup,
  FinishedGoodsGroupBatch,
  groupFinishedGoodsBatches,
} from "@/types/inventory";

export interface FgBatchWithRelations extends FinishedGoodsGroupBatch {}

interface FgBatchTableProps {
  groups?: FinishedGoodsGroup[];
  batches?: FgBatchWithRelations[];
}

export function FgBatchTable({ groups: propGroups, batches: propBatches }: FgBatchTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSourceType, setSelectedSourceType] = useState<string>("ALL");
  const [selectedStation, setSelectedStation] = useState<string>("ALL");
  const [selectedProduct, setSelectedProduct] = useState<string>("ALL");

  // Selected group for Details Drawer / Sheet
  const [activeGroup, setActiveGroup] = useState<FinishedGoodsGroup | null>(null);

  // Normalize data to groups
  const groups: FinishedGoodsGroup[] = useMemo(() => {
    if (propGroups && propGroups.length > 0) {
      return propGroups;
    }
    if (propBatches && propBatches.length > 0) {
      return groupFinishedGoodsBatches(propBatches);
    }
    return [];
  }, [propGroups, propBatches]);

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
      if (g.productName) {
        map.set(g.productName, g.productName);
      }
    });
    return Array.from(map.values()).sort();
  }, [groups]);

  // Filtered groups calculation
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const searchLower = searchTerm.toLowerCase().trim();

      // Search match: productName, station name, location, or any batch fgBatchId / dealRef / sourceOpId / supplier name
      let matchesSearch = !searchTerm;
      if (searchTerm) {
        const matchesGroupHeader =
          g.productName.toLowerCase().includes(searchLower) ||
          (g.station?.name && g.station.name.toLowerCase().includes(searchLower)) ||
          (g.station?.location && g.station.location.toLowerCase().includes(searchLower));

        const matchesInnerBatches = g.batches.some((b) => {
          if (b.fgBatchId.toLowerCase().includes(searchLower)) return true;
          if (b.dealRef && b.dealRef.toLowerCase().includes(searchLower)) return true;
          if (b.sourceOpId && b.sourceOpId.toLowerCase().includes(searchLower)) return true;

          // Check supplier names inside suppliersSummary JSON
          if (b.suppliersSummary) {
            let list: SupplierShare[] = [];
            if (Array.isArray(b.suppliersSummary)) {
              list = b.suppliersSummary;
            } else if (typeof b.suppliersSummary === "string") {
              try {
                list = JSON.parse(b.suppliersSummary);
              } catch {
                list = [];
              }
            }
            if (list.some((s) => s.supplierName?.toLowerCase().includes(searchLower))) {
              return true;
            }
          }

          return false;
        });

        matchesSearch = matchesGroupHeader || matchesInnerBatches;
      }

      // Source filter: matches if group contains batches with this source
      const matchesSource =
        selectedSourceType === "ALL" ||
        g.sourceTypes.includes(selectedSourceType);

      // Station filter
      const matchesStation =
        selectedStation === "ALL" || g.station?.name === selectedStation;

      // Product filter
      const matchesProduct =
        selectedProduct === "ALL" || g.productName === selectedProduct;

      return matchesSearch && matchesSource && matchesStation && matchesProduct;
    });
  }, [groups, searchTerm, selectedSourceType, selectedStation, selectedProduct]);

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <Card className="border-gray-200 shadow-sm p-4 bg-white">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="بحث برقم الباتش، الصنف، المحطة، المورد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 pl-3 text-sm"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Source Type Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <span className="font-semibold text-gray-600">نوع المصدر:</span>
              <select
                value={selectedSourceType}
                onChange={(e) => setSelectedSourceType(e.target.value)}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">كل المصادر</option>
                <option value="MANUFACTURED">إنتاج محلي</option>
                <option value="DIRECT_PURCHASE">صفقة مباشرة</option>
              </select>
            </div>

            {/* Station Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700">
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
              <span className="font-semibold text-gray-600">الصنف:</span>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">كل الأصناف</option>
                {productsList.map((prod) => (
                  <option key={prod} value={prod}>
                    {prod}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters button if any filter is active */}
            {(selectedSourceType !== "ALL" ||
              selectedStation !== "ALL" ||
              selectedProduct !== "ALL" ||
              searchTerm) && (
              <button
                onClick={() => {
                  setSelectedSourceType("ALL");
                  setSelectedStation("ALL");
                  setSelectedProduct("ALL");
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
                  <th className="py-3.5 px-4">الصنف التصديري</th>
                  <th className="py-3.5 px-4">المحطة والموقع</th>
                  <th className="py-3.5 px-4 text-center">نوع المصدر</th>
                  <th className="py-3.5 px-4 text-center">عدد الباتشات</th>
                  <th className="py-3.5 px-4">تاريخ الإنتاج</th>
                  <th className="py-3.5 px-4">إجمالي الرصيد المتاح</th>
                  <th className="py-3.5 px-4">تكلفة الكيلو الموزونة</th>
                  <th className="py-3.5 px-4">إجمالي قيمة المخزون</th>
                  <th className="py-3.5 px-4 text-center">تتبع الموردين (DNA)</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-500">
                      <Boxes className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      لا توجد مجموعات أصناف جاهزة تطابق الفلاتر المحددة حالياً.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group) => {
                    const isAllManufactured =
                      group.sourceTypes.length === 1 &&
                      group.sourceTypes[0] === "MANUFACTURED";
                    const isAllDirect =
                      group.sourceTypes.length === 1 &&
                      group.sourceTypes[0] === "DIRECT_PURCHASE";

                    const dateDisplay =
                      group.earliestProdDate === group.latestProdDate
                        ? group.earliestProdDate || "-"
                        : `${group.earliestProdDate} إلى ${group.latestProdDate}`;

                    return (
                      <tr
                        key={group.groupId}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        {/* 1. Export Product */}
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                              <Package className="h-4 w-4" />
                            </div>
                            <span className="text-base text-gray-950 font-bold">
                              {group.productName}
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

                        {/* 3. Source Type */}
                        <td className="py-3.5 px-4 text-center">
                          {isAllManufactured ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 gap-1 font-bold">
                              <Layers className="h-3 w-3 text-emerald-600" />
                              إنتاج محلي
                            </Badge>
                          ) : isAllDirect ? (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100 gap-1 font-bold">
                              <ShoppingBag className="h-3 w-3 text-blue-600" />
                              صفقة مباشرة
                            </Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1 justify-center">
                              <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 font-bold text-xs">
                                مصادر متعددة ({group.sourceTypes.length})
                              </Badge>
                            </div>
                          )}
                        </td>

                        {/* 4. Batches Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md border border-gray-200">
                            <Layers className="h-3 w-3 text-gray-500" />
                            {group.batchesCount} {group.batchesCount === 1 ? "باتش" : "باتشات"}
                          </span>
                        </td>

                        {/* 5. Production Date Range */}
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

                        {/* 9. DNA Supplier Tree */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setActiveGroup(group)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md transition-colors"
                          >
                            <Dna className="h-3.5 w-3.5 text-purple-600" />
                            عرض التتبع ({group.batchesCount})
                          </button>
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
                      <Package className="h-5 w-5 text-emerald-700" />
                      {activeGroup.productName}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-gray-500 flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      المحطة: {activeGroup.station?.name}
                      {activeGroup.station?.location && ` (${activeGroup.station.location})`}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Group KPIs Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-semibold block">إجمالي الرصيد المتاح</span>
                  <p className="text-lg font-bold text-[#012d1d] font-mono mt-1">
                    {activeGroup.totalAvailableQty.toLocaleString()} كجم
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-semibold block">متوسط التكلفة الموزونة</span>
                  <p className="text-lg font-bold text-cyan-900 font-mono mt-1">
                    {formatCurrency(activeGroup.weightedAverageCost)} / كجم
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-semibold block">إجمالي قيمة المخزون</span>
                  <p className="text-lg font-bold text-[#0054cd] font-mono mt-1">
                    {formatCurrency(activeGroup.totalValue)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-xs text-gray-500 font-semibold block">عدد اللوطات المكونة</span>
                  <p className="text-lg font-bold text-purple-900 font-mono mt-1">
                    {activeGroup.batchesCount} باتش
                  </p>
                </div>
              </div>

              {/* Batches Detailed List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-700" />
                    قائمة الباتشات واللوطات التفصيلية ({activeGroup.batches.length})
                  </h3>
                  <span className="text-xs text-gray-500">
                    انقر على رقم أي باتش لفتح بطاقة التتبع الشاملة
                  </span>
                </div>

                <div className="space-y-3">
                  {activeGroup.batches.map((batch) => {
                    const isManufactured = batch.sourceType === "MANUFACTURED";
                    const prodDate = batch.productionDate
                      ? new Date(batch.productionDate).toISOString().split("T")[0]
                      : "-";
                    const expDate = batch.expiryDate
                      ? new Date(batch.expiryDate).toISOString().split("T")[0]
                      : null;

                    return (
                      <Card
                        key={batch.fgBatchId}
                        className="bg-white border-gray-200 shadow-sm overflow-hidden hover:border-emerald-300 transition-colors"
                      >
                        {/* Batch Header Bar */}
                        <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/inventory/${batch.fgBatchId}`}
                              className="font-mono font-bold text-sm text-[#012d1d] hover:underline flex items-center gap-1"
                              title="فتح بطاقة الباتش الكاملة"
                            >
                              <Package className="h-4 w-4 text-emerald-700 shrink-0" />
                              {batch.fgBatchId}
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            </Link>

                            {isManufactured ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px] py-0 px-2 font-bold">
                                إنتاج محلي
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[11px] py-0 px-2 font-bold">
                                صفقة مباشرة
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-600 font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              إنتاج: {prodDate}
                            </span>
                            {expDate && (
                              <span className="text-gray-500">
                                انتهاء: {expDate}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Batch Body Grid */}
                        <CardContent className="p-4 space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-gray-500 block font-medium">الرصيد المتاح</span>
                              <span className="font-bold text-[#012d1d] font-mono text-sm block mt-0.5">
                                {Number(batch.availableQty || 0).toLocaleString()} كجم
                              </span>
                              {batch.initialQty && (
                                <span className="text-[10px] text-gray-400">
                                  من أصل {Number(batch.initialQty).toLocaleString()} كجم
                                </span>
                              )}
                            </div>

                            <div>
                              <span className="text-gray-500 block font-medium">تكلفة الكيلو</span>
                              <span className="font-bold text-cyan-900 font-mono text-sm block mt-0.5">
                                {formatCurrency(Number(batch.costPerKg || 0))} / كجم
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-500 block font-medium">إجمالي قيمة الباتش</span>
                              <span className="font-bold text-[#0054cd] font-mono text-sm block mt-0.5">
                                {formatCurrency(Number(batch.totalValue || 0))}
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-500 block font-medium">مرجع العملية / الصفقة</span>
                              <span className="font-mono font-bold text-gray-700 text-xs block mt-0.5">
                                {batch.sourceOpId ? (
                                  `عملية: ${batch.sourceOpId}`
                                ) : batch.dealRef ? (
                                  `صفقة: ${batch.dealRef}`
                                ) : (
                                  "-"
                                )}
                              </span>
                            </div>
                          </div>

                          {/* DNA Traceability Section for this batch */}
                          <div className="pt-3 border-t border-gray-100 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                              <Dna className="h-3.5 w-3.5 text-purple-600" />
                              شجرة تتبع المزارعين والموردين المساهمين (DNA Traceability):
                            </div>
                            <BatchDnaBadge suppliersSummary={batch.suppliersSummary} />
                          </div>

                          {/* Raw Sources if available */}
                          {batch.rawSources && (
                            <div className="pt-2 text-xs">
                              <span className="text-gray-500 font-medium ml-1">لوطات الخام المستخدمة:</span>
                              <span className="font-mono text-gray-700">
                                {typeof batch.rawSources === "string"
                                  ? batch.rawSources
                                  : JSON.stringify(batch.rawSources)}
                              </span>
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

