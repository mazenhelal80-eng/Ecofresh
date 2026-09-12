"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Filter, RotateCcw, Printer } from "lucide-react";

interface StatementFiltersProps {
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
}

export function StatementFilters({
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
}: StatementFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");

  React.useEffect(() => {
    const queryFrom = searchParams.get("dateFrom") || "";
    const queryTo = searchParams.get("dateTo") || "";
    if (queryFrom !== dateFrom) setDateFrom(queryFrom);
    if (queryTo !== dateTo) setDateTo(queryTo);
  }, [searchParams]);

  const applyFilters = (from?: string, to?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const f = from !== undefined ? from : dateFrom;
    const t = to !== undefined ? to : dateTo;

    if (f) params.set("dateFrom", f);
    else params.delete("dateFrom");

    if (t) params.set("dateTo", t);
    else params.delete("dateTo");

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    router.push(pathname);
    router.refresh();
  };

  const setPreset = (preset: "thisMonth" | "last30Days" | "thisYear" | "all") => {
    const now = new Date();
    if (preset === "all") {
      resetFilters();
      return;
    }

    let fromStr = "";
    let toStr = now.toISOString().split("T")[0];

    if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      fromStr = firstDay.toISOString().split("T")[0];
    } else if (preset === "last30Days") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      fromStr = past30.toISOString().split("T")[0];
    } else if (preset === "thisYear") {
      const firstYearDay = new Date(now.getFullYear(), 0, 1);
      fromStr = firstYearDay.toISOString().split("T")[0];
    }

    setDateFrom(fromStr);
    setDateTo(toStr);
    applyFilters(fromStr, toStr);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date Inputs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
            <Calendar className="w-4 h-4 text-primary" />
            <span>من تاريخ:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs w-36 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
            <span>إلى تاريخ:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs w-36 font-mono"
            />
          </div>

          <Button
            size="sm"
            onClick={() => applyFilters()}
            className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
          >
            <Filter className="w-3.5 h-3.5" />
            تصفية
          </Button>

          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1 text-xs text-gray-500 hover:text-gray-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              إلغاء التصفية
            </Button>
          )}
        </div>

        {/* Quick Presets & Print */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreset("thisMonth")}
            className="h-7 text-xs px-2.5"
          >
            هذا الشهر
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreset("last30Days")}
            className="h-7 text-xs px-2.5"
          >
            آخر 30 يوم
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreset("thisYear")}
            className="h-7 text-xs px-2.5"
          >
            هذا العام
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-7 text-xs px-2.5 gap-1 text-gray-700 hover:text-gray-900"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة
          </Button>
        </div>
      </div>

      {/* Pagination Bar if more than 1 page */}
      {totalPages > 1 && (
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            إجمالي الحركات: <strong className="font-mono text-gray-800">{totalCount}</strong> قيد (صفحة {currentPage} من {totalPages})
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="h-7 text-xs px-2"
            >
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="h-7 text-xs px-2"
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
