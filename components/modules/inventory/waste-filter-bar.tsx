"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar, Filter, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StationOption {
  id: string;
  name: string;
}

interface WasteFilterBarProps {
  stations: StationOption[];
  currentPeriod: string;
  currentStationId: string;
  startDateStr?: string;
  endDateStr?: string;
  periodLabel: string;
}

export function WasteFilterBar({
  stations,
  currentPeriod,
  currentStationId,
  startDateStr,
  endDateStr,
  periodLabel,
}: WasteFilterBarProps) {
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
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Period Buttons */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => handlePeriodChange("weekly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              period === "weekly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            أسبوعي (Weekly)
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("monthly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              period === "monthly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            شهري (Monthly)
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("yearly")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              period === "yearly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            سنوي (Yearly)
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("custom")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              period === "custom"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            فترة مخصصة
          </button>
        </div>

        {/* Station Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-600">المحطة:</span>
          <select
            value={stationId}
            onChange={(e) => handleStationChange(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
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

      {/* Custom Date Range Row */}
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">من تاريخ:</span>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 text-xs w-36 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">إلى تاريخ:</span>
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
            className="h-8 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
          >
            تطبيق النطاق
          </Button>
        </div>
      )}

      {/* Current Active Filter Indicator Banner */}
      <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2 rounded-lg text-xs">
        <div className="flex items-center gap-2 text-emerald-900">
          <Clock className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>
            الفترة النشطة: <strong className="font-mono">{periodLabel}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-emerald-900">
          <Building2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>
            نطاق التحليل:{" "}
            <strong>
              {stationId === "all"
                ? "كل المحطات"
                : stations.find((s) => s.id === stationId)?.name || stationId}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
