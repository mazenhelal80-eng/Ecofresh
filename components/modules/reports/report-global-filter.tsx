"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, Filter, Building2, Clock, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StationOption {
  id: string;
  name: string;
}

interface ReportGlobalFilterProps {
  stations: StationOption[];
  currentPeriod: string;
  currentStationId: string;
  currentTab: string;
  startDateStr?: string;
  endDateStr?: string;
  periodLabel: string;
}

export function ReportGlobalFilter({
  stations,
  currentPeriod,
  currentStationId,
  currentTab,
  startDateStr,
  endDateStr,
  periodLabel,
}: ReportGlobalFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [period, setPeriod] = useState(currentPeriod || "monthly");
  const [stationId, setStationId] = useState(currentStationId || "all");
  const [customStart, setCustomStart] = useState(startDateStr || "");
  const [customEnd, setCustomEnd] = useState(endDateStr || "");

  const applyFilters = (newPeriod?: string, newStationId?: string, newStart?: string, newEnd?: string) => {
    const targetPeriod = newPeriod !== undefined ? newPeriod : period;
    const targetStation = newStationId !== undefined ? newStationId : stationId;
    const targetStart = newStart !== undefined ? newStart : customStart;
    const targetEnd = newEnd !== undefined ? newEnd : customEnd;

    const params = new URLSearchParams(searchParams.toString());
    if (currentTab) params.set("tab", currentTab);
    if (targetPeriod) params.set("period", targetPeriod);
    
    if (targetStation && targetStation !== "all") {
      params.set("stationId", targetStation);
    } else {
      params.delete("stationId");
    }

    if (targetPeriod === "custom") {
      if (targetStart) params.set("startDate", targetStart);
      else params.delete("startDate");
      if (targetEnd) params.set("endDate", targetEnd);
      else params.delete("endDate");
    } else {
      params.delete("startDate");
      params.delete("endDate");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    });
  };

  React.useEffect(() => {
    setPeriod(currentPeriod || "monthly");
    setStationId(currentStationId || "all");
    if (startDateStr) setCustomStart(startDateStr);
    if (endDateStr) setCustomEnd(endDateStr);
  }, [currentPeriod, currentStationId, startDateStr, endDateStr]);

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (val !== "custom") {
      applyFilters(val, stationId);
    }
  };

  const handleStationChange = (val: string) => {
    setStationId(val);
    applyFilters(period, val);
  };

  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Period Selector Buttons */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
          <button
            type="button"
            onClick={() => handlePeriodChange("weekly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              period === "weekly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            أسبوعي (Weekly)
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("monthly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              period === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            شهري (Monthly)
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("yearly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              period === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            سنوي (Yearly)
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("custom")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              period === "custom"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            فترة مخصصة
          </button>
        </div>

        {/* Station Dropdown */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">نطاق المحطات:</span>
          <select
            value={stationId}
            onChange={(e) => handleStationChange(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">كل المحطات (All Stations)</option>
            {stations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">من تاريخ:</span>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 text-xs w-36 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">إلى تاريخ:</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 text-xs w-36 font-mono"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => applyFilters("custom", stationId, customStart, customEnd)}
            className="h-8 text-xs font-bold gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            تطبيق النطاق
          </Button>
        </div>
      )}

      {/* Selected Period Badge Banner & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/10 border border-primary/20 px-3.5 py-2.5 rounded-lg text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span>
              الفترة المحددة: <strong className="font-mono">{periodLabel}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span>
              المحطات:{" "}
              <strong>
                {stationId === "all"
                  ? "كل المحطات"
                  : stations.find((s) => s.id === stationId)?.name || stationId}
              </strong>
            </span>
          </div>
        </div>

        {/* Quick Print & Excel Actions */}
        <div className="flex items-center gap-2 print:hidden">
          <a
            href={`/api/export/excel/reports?period=${period}&stationId=${stationId}${startDateStr ? `&startDate=${startDateStr}` : ''}${endDateStr ? `&endDate=${endDateStr}` : ''}`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
            title="تصدير التقرير الشامل إلى ملف إكسيل متعدد الجداول"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            تصدير إكسيل (Excel)
          </a>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card hover:bg-muted text-foreground border border-border font-bold text-xs transition-colors"
            title="طباعة التقرير"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            طباعة
          </button>
        </div>
      </div>
    </div>
  );
}
