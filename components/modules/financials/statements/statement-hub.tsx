"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  LineChart,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RecordMovementModal } from "./record-movement-modal";
import { TransactionDetailsDrawer, TransactionDetailData } from "@/components/modules/financials/transaction-details-drawer";

interface StatementHubProps {
  initialReport: any;
  partiesData: {
    suppliers: any[];
    customers: any[];
    contractors: any[];
    employees: any[];
    treasuryAccounts: any[];
  };
  searchParams: {
    partyType?: string;
    partyId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export function StatementHub({
  initialReport,
  partiesData,
  searchParams,
}: StatementHubProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Top Filter Controls
  const [partyType, setPartyType] = useState<string>(searchParams.partyType || "SUPPLIERS");
  const [partyId, setPartyId] = useState<string>(
    searchParams.partyId || initialReport?.statement?.partyInfo?.partyId || partiesData.suppliers[0]?.id || ""
  );
  const [dateFrom, setDateFrom] = useState<string>(searchParams.dateFrom || "");
  const [dateTo, setDateTo] = useState<string>(searchParams.dateTo || "");

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "ledger" | "operations" | "payments" | "timeline" | "stats" | "audit"
  >("ledger");

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedTxnForDrawer, setSelectedTxnForDrawer] = useState<TransactionDetailData | null>(null);

  // Sub-filter for Ledger Tab
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerMovementType, setLedgerMovementType] = useState("ALL");
  const [ledgerDateFrom, setLedgerDateFrom] = useState("");
  const [ledgerDateTo, setLedgerDateTo] = useState("");

  // Filtered party options
  const activePartyOptions = React.useMemo(() => {
    if (partyType.toUpperCase().includes("CUSTOMER")) return partiesData.customers;
    if (partyType.toUpperCase().includes("CONTRACTOR")) return partiesData.contractors;
    if (partyType.toUpperCase().includes("EMPLOYEE")) return partiesData.employees;
    return partiesData.suppliers;
  }, [partyType, partiesData]);

  // When partyType changes, auto-select first party
  const handlePartyTypeChange = (newType: string) => {
    setPartyType(newType);
    let options = partiesData.suppliers;
    if (newType.toUpperCase().includes("CUSTOMER")) options = partiesData.customers;
    else if (newType.toUpperCase().includes("CONTRACTOR")) options = partiesData.contractors;
    else if (newType.toUpperCase().includes("EMPLOYEE")) options = partiesData.employees;

    if (options.length > 0) {
      setPartyId(options[0].id);
    } else {
      setPartyId("");
    }
  };

  React.useEffect(() => {
    if (searchParams.partyType && searchParams.partyType !== partyType) {
      setPartyType(searchParams.partyType);
    }
    if (searchParams.partyId && searchParams.partyId !== partyId) {
      setPartyId(searchParams.partyId);
    }
    if (searchParams.dateFrom !== undefined && searchParams.dateFrom !== dateFrom) {
      setDateFrom(searchParams.dateFrom);
    }
    if (searchParams.dateTo !== undefined && searchParams.dateTo !== dateTo) {
      setDateTo(searchParams.dateTo);
    }
  }, [searchParams]);

  const handleApplyFilter = () => {
    // Avoid startTransition to prevent Next.js router from hanging if navigating to the same URL
    const query = new URLSearchParams();
    if (partyType) query.set("partyType", partyType);
    if (partyId) query.set("partyId", partyId);
    if (dateFrom) query.set("dateFrom", dateFrom);
    if (dateTo) query.set("dateTo", dateTo);
    router.push(`/financials/statements?${query.toString()}`);
    router.refresh();
  };

  const handlePrint = () => {
    window.print();
  };

  const statement = initialReport?.statement;
  const partyInfo = statement?.partyInfo;
  const summary = statement?.summary;
  const tabs = statement?.tabs;

  // Filter running rows based on sub-filters
  const filteredRows = React.useMemo(() => {
    if (!tabs?.runningRows) return [];
    return tabs.runningRows.filter((r: any) => {
      if (ledgerMovementType !== "ALL" && !r.type.includes(ledgerMovementType)) {
        return false;
      }
      if (ledgerSearch) {
        const s = ledgerSearch.toLowerCase();
        const matches =
          r.txnId.toLowerCase().includes(s) ||
          (r.refDoc && r.refDoc.toLowerCase().includes(s)) ||
          (r.description && r.description.toLowerCase().includes(s)) ||
          r.type.toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (ledgerDateFrom && r.date < ledgerDateFrom) return false;
      if (ledgerDateTo && r.date > ledgerDateTo) return false;
      return true;
    });
  }, [tabs?.runningRows, ledgerMovementType, ledgerSearch, ledgerDateFrom, ledgerDateTo]);

  return (
    <div className="space-y-6 dir-rtl text-right print:p-0">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & FILTERS BAR (Matching Screenshot 3)                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
          <FileText className="w-8 h-8 text-emerald-800" />
          كشوف الحسابات
        </h1>

        {/* Action button matching green button in Screenshot 3 */}
        <Button
          onClick={() => setIsRecordModalOpen(true)}
          className="bg-[#196b24] hover:bg-[#13571d] text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          تسجيل حركة مالية / تسوية
        </Button>
      </div>

      {/* Filter Toolbar matching Screenshot 3 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs print:hidden space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Party Type Dropdown */}
          <div className="lg:col-span-3 space-y-1">
            <Label className="text-xs font-semibold text-gray-600">نوع الجهة</Label>
            <select
              value={partyType}
              onChange={(e) => handlePartyTypeChange(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700"
            >
              <option value="SUPPLIERS">موردون</option>
              <option value="CUSTOMERS">عملاء</option>
              <option value="CONTRACTORS">مقاولون</option>
              <option value="EMPLOYEES">موظفون</option>
            </select>
          </div>

          {/* Account / Person Dropdown */}
          <div className="lg:col-span-3 space-y-1">
            <Label className="text-xs font-semibold text-gray-600">الحساب / الشخص</Label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700"
            >
              {activePartyOptions.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.code ? `(${p.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="lg:col-span-2 space-y-1">
            <Label className="text-xs font-semibold text-gray-600">من تاريخ</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-white border-gray-200 text-xs h-10 font-mono"
            />
          </div>

          {/* To Date */}
          <div className="lg:col-span-2 space-y-1">
            <Label className="text-xs font-semibold text-gray-600">إلى تاريخ</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-white border-gray-200 text-xs h-10 font-mono"
            />
          </div>

          {/* View Statement & Print Buttons */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <Button
              onClick={handleApplyFilter}
              disabled={isPending}
              className="flex-1 bg-[#196b24] hover:bg-[#13571d] text-white font-bold text-xs h-10 rounded-xl transition-colors shadow-xs"
            >
              {isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "عرض الكشف"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              title="طباعة كشف الحساب"
              className="h-10 w-10 p-0 text-gray-600 hover:text-gray-900 border-gray-200 rounded-xl"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY CARDS & PARTY INFO (Matching Screenshot 3)                     */}
      {/* ========================================================================= */}
      {statement ? (
        <div className="space-y-4">
          {/* Party Hero Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Right side: Title & Period */}
              <div>
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  {partyInfo?.partyName || "حساب الطرف"}
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  كشف حساب مفصل للفترة من {statement.period?.dateFrom} إلى {statement.period?.dateTo} ({partyInfo?.partyCategory})
                </p>
              </div>

              {/* Cards row matching the 4 colored cards in Screenshot 3 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Card 1: Total Purchases / Sales (Green tint) */}
                <div className="bg-[#f0fbf3] border border-[#d2f3d9] rounded-xl p-3 text-center min-w-[130px]">
                  <span className="text-[11px] font-bold text-emerald-900 block">
                    {partyInfo?.isCustomer ? "إجمالي المبيعات" : "إجمالي المشتريات"}
                  </span>
                  <div className="text-lg font-black text-emerald-800 font-mono mt-0.5">
                    {summary?.totalPurchasesOrSales.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>

                {/* Card 2: Total Paid / Collected (Orange/Amber tint) */}
                <div className="bg-[#fff9f0] border border-[#fee7c8] rounded-xl p-3 text-center min-w-[130px]">
                  <span className="text-[11px] font-bold text-amber-900 block">
                    {partyInfo?.isCustomer ? "إجمالي المحصل" : "إجمالي المسدد"}
                  </span>
                  <div className="text-lg font-black text-amber-800 font-mono mt-0.5">
                    {summary?.totalPaidOrCollected.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>

                {/* Card 3: Current Remaining Balance (Blue tint, highlighted) */}
                <div className="bg-[#edf5ff] border border-[#cfe2ff] rounded-xl p-3 text-center min-w-[150px] shadow-xs">
                  <span className="text-[11px] font-bold text-blue-900 block">
                    الرصيد المتبقي (الحالي)
                  </span>
                  <div className="text-xl font-black text-blue-900 font-mono mt-0.5">
                    {summary?.currentBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-xs font-sans font-bold text-blue-700">ج.م</span>
                  </div>
                </div>

                {/* Card 4: Related Trips / Operations (Purple tint) */}
                <div className="bg-[#fbf4ff] border border-[#f0d6ff] rounded-xl p-3 text-center min-w-[130px]">
                  <span className="text-[11px] font-bold text-purple-900 block">
                    {partyInfo?.isCustomer ? "الشحنات والطلبيات" : "العمليات المرتبطة"}
                  </span>
                  <div className="text-lg font-black text-purple-800 font-mono mt-0.5">
                    {summary?.relatedOperationsCount || 0}
                  </div>
                  <span className="text-[10px] text-purple-600 block">
                    {summary?.relatedOperationsCount > 0 ? "عملية مسجلة" : "لا توجد عمليات"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. TABS NAVIGATION (Matching Screenshot 3)                                 */}
          {/* ========================================================================= */}
          <div className="border-b border-gray-200 bg-white rounded-t-2xl px-4 pt-2 shadow-xs print:hidden">
            <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto text-xs font-bold scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("ledger")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "ledger"
                    ? "border-[#196b24] text-[#196b24]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>كشف الحساب الجاري (الدفتر)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("operations")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "operations"
                    ? "border-[#196b24] text-[#196b24]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>الرحلات / العمليات المرتبطة</span>
                {summary?.relatedOperationsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {summary.relatedOperationsCount}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("payments")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "payments"
                    ? "border-[#196b24] text-[#196b24]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>سجل المدفوعات</span>
                {tabs?.paymentRows?.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tabs.paymentRows.length}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "timeline"
                    ? "border-[#196b24] text-[#196b24]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <History className="w-4 h-4" />
                <span>الخط الزمني (Timeline)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("stats")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "stats"
                    ? "border-[#196b24] text-[#196b24]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <LineChart className="w-4 h-4" />
                <span>إحصائيات</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "audit"
                    ? "border-[#196b24] text-[#196b24]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>سجل النشاطات</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. TAB CONTENTS                                                           */}
          {/* ========================================================================= */}

          {/* TAB 1: RUNNING STATEMENT LEDGER (Matching Screenshot 3 Table) */}
          {activeTab === "ledger" && (
            <div className="bg-white border border-gray-200 rounded-b-2xl p-4 shadow-xs space-y-4">
              {/* Sub-filters toolbar matching Screenshot 3 */}
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-3 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center text-xs">
                  {/* Search box */}
                  <div className="lg:col-span-4 relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      placeholder="بحث (رقم الحركة، الرحلة، الوصف...)"
                      className="pr-9 bg-white border-gray-200 text-xs h-9"
                    />
                  </div>

                  {/* Sub Date From */}
                  <div className="lg:col-span-2">
                    <Input
                      type="date"
                      value={ledgerDateFrom}
                      onChange={(e) => setLedgerDateFrom(e.target.value)}
                      className="bg-white border-gray-200 text-xs h-9 font-mono"
                    />
                  </div>

                  {/* Sub Date To */}
                  <div className="lg:col-span-2">
                    <Input
                      type="date"
                      value={ledgerDateTo}
                      onChange={(e) => setLedgerDateTo(e.target.value)}
                      className="bg-white border-gray-200 text-xs h-9 font-mono"
                    />
                  </div>

                  {/* Movement Type Filter */}
                  <div className="lg:col-span-2">
                    <select
                      value={ledgerMovementType}
                      onChange={(e) => setLedgerMovementType(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700 font-medium"
                    >
                      <option value="ALL">نوع الحركة: الكل</option>
                      <option value="استحقاق">استحقاقات</option>
                      <option value="سداد">سدادات</option>
                      <option value="تحصيل">تحصيلات</option>
                      <option value="تسوية">تسويات</option>
                    </select>
                  </div>

                  {/* Reset Button */}
                  <div className="lg:col-span-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLedgerSearch("");
                        setLedgerMovementType("ALL");
                        setLedgerDateFrom("");
                        setLedgerDateTo("");
                      }}
                      className="text-xs text-gray-500 hover:text-gray-900 gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      إعادة ضبط
                    </Button>
                  </div>
                </div>
              </div>

              {/* Transactions Table with exact columns from Screenshot 3 */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs text-right">
                  <thead className="bg-[#f7fafc] text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3 font-mono">رقم الحركة</th>
                      <th className="p-3 font-mono">رقم الرحلة</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">البيان</th>
                      <th className="p-3 text-center text-rose-700">مدين (Debit)</th>
                      <th className="p-3 text-center text-emerald-700">دائن (Credit)</th>
                      <th className="p-3 text-center text-blue-900">الرصيد (Balance)</th>
                      <th className="p-3">الخزينة (Cashbox)</th>
                      <th className="p-3">طريقة الدفع</th>
                      <th className="p-3">بواسطة</th>
                      <th className="p-3 text-center print:hidden">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {/* Opening Balance Row */}
                    <tr className="bg-emerald-50/40 font-bold text-gray-800">
                      <td colSpan={5} className="p-3 font-sans text-xs text-emerald-950">
                        الرصيد الافتتاحي السابق (قبل بداية الفترة):
                      </td>
                      <td className="p-3 text-center text-gray-400">—</td>
                      <td className="p-3 text-center text-gray-400">—</td>
                      <td className="p-3 text-center font-extrabold text-blue-950">
                        {summary?.openingBalance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td colSpan={4} className="p-3 text-gray-400 font-sans text-[11px]">
                        رصيد مرحل
                      </td>
                    </tr>

                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-gray-400 font-sans">
                          لا توجد حركات مسجلة في هذه الفترة
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row: any) => {
                        const isCancelled = row.isCancelled;
                        return (
                          <tr
                            key={row.txnId}
                            onClick={() => setSelectedTxnForDrawer(row)}
                            className={`cursor-pointer transition-colors ${
                              isCancelled
                                ? "bg-rose-50/30 text-gray-400 line-through opacity-70 hover:bg-rose-50/50"
                                : "hover:bg-gray-50/80"
                            }`}
                          >
                            <td className="p-3 text-gray-600 font-mono">{row.date}</td>
                            <td className="p-3 font-bold text-primary hover:underline">
                              {row.txnId}
                            </td>
                            <td className="p-3">
                              {row.relatedOperationNo ? (
                                <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                                  {row.relatedOperationNo}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-3 font-sans not-italic">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.type.includes("تحصيل")
                                    ? "bg-emerald-100 text-emerald-800"
                                    : row.type.includes("سداد")
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {row.type}
                              </span>
                            </td>
                            <td className="p-3 font-sans text-gray-700 max-w-[200px] truncate not-italic">
                              {row.description || "—"}
                            </td>
                            <td className="p-3 text-center font-bold text-rose-700">
                              {row.debit > 0
                                ? row.debit.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                : "—"}
                            </td>
                            <td className="p-3 text-center font-bold text-emerald-700">
                              {row.credit > 0
                                ? row.credit.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                : "—"}
                            </td>
                            <td className="p-3 text-center font-extrabold text-blue-900">
                              {row.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 font-sans text-gray-600 not-italic">
                              {row.accountName || "—"}
                            </td>
                            <td className="p-3 font-sans text-gray-600 not-italic">
                              {row.paymentMethod || "نقدي"}
                            </td>
                            <td className="p-3 font-sans text-gray-500 not-italic text-[11px]">
                              {row.createdByName}
                            </td>
                            <td className="p-3 text-center print:hidden">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTxnForDrawer(row);
                                }}
                                className="h-7 w-7 p-0 text-gray-500 hover:text-primary"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: RELATED OPERATIONS */}
          {activeTab === "operations" && (
            <div className="bg-white border border-gray-200 rounded-b-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  العمليات والصفقات التشغيلية المرتبطة بهذا الطرف
                </h3>
                <span className="text-xs text-gray-500">
                  إجمالي {tabs?.relatedOperations?.length || 0} عملية
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">نوع العملية</th>
                      <th className="p-3 font-mono">رقم الكود / المستند</th>
                      <th className="p-3">التفاصيل والبيان</th>
                      <th className="p-3 text-center">الكمية / القيمة</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                    {tabs?.relatedOperations?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-gray-400">
                          لا توجد عمليات تشغيلية مسجلة لهذا الطرف.
                        </td>
                      </tr>
                    ) : (
                      tabs.relatedOperations.map((op: any) => (
                        <tr key={op.id} className="hover:bg-gray-50">
                          <td className="p-3 font-mono text-gray-600">{op.date}</td>
                          <td className="p-3 font-bold text-gray-800">{op.operationType}</td>
                          <td className="p-3 font-mono text-blue-800 font-bold">{op.codeOrDoc}</td>
                          <td className="p-3 text-gray-600">{op.details}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-800">
                            {op.amountOrQty}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px]">
                              {op.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                              <a href={op.viewLink}>
                                <ExternalLink className="w-3 h-3" />
                                فتح العملية
                              </a>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS RECORD */}
          {activeTab === "payments" && (
            <div className="bg-white border border-gray-200 rounded-b-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  سجل السندات والمدفوعات النقدية والبنكية
                </h3>
                <span className="text-xs text-gray-500">
                  إجمالي {tabs?.paymentRows?.length || 0} سند
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3 font-mono">رقم السند</th>
                      <th className="p-3">نوع الحركة</th>
                      <th className="p-3 text-center">المبلغ</th>
                      <th className="p-3">الخزينة / الحساب</th>
                      <th className="p-3">طريقة السداد</th>
                      <th className="p-3 font-mono">المستند المرجعي</th>
                      <th className="p-3">البيان</th>
                      <th className="p-3">المسؤول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                    {tabs?.paymentRows?.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-gray-400">
                          لا توجد سندات دفع أو قبض مسجلة لهذا الطرف.
                        </td>
                      </tr>
                    ) : (
                      tabs.paymentRows.map((pay: any) => (
                        <tr key={pay.txnId} className="hover:bg-gray-50">
                          <td className="p-3 font-mono text-gray-600">{pay.date}</td>
                          <td className="p-3 font-mono font-bold text-primary">{pay.txnId}</td>
                          <td className="p-3 font-bold text-gray-800">{pay.type}</td>
                          <td className="p-3 text-center font-mono font-black text-sm text-emerald-800">
                            {pay.amountEgp.toLocaleString("en-US", { minimumFractionDigits: 2 })} {pay.currency}
                          </td>
                          <td className="p-3 text-gray-700">{pay.accountName}</td>
                          <td className="p-3 text-gray-600">{pay.paymentMethod}</td>
                          <td className="p-3 font-mono text-gray-500">{pay.refDoc || "—"}</td>
                          <td className="p-3 text-gray-600 max-w-[200px] truncate">{pay.description || "—"}</td>
                          <td className="p-3 text-gray-500 text-[11px]">{pay.createdByName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="bg-white border border-gray-200 rounded-b-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 mb-4">
                الخط الزمني التفاعلي للحركات المالية
              </h3>
              <div className="relative border-r-2 border-emerald-100 mr-4 space-y-6 pr-6">
                {tabs?.timelineEvents?.length === 0 ? (
                  <p className="text-gray-400 text-xs">لا توجد أحداث زمنية مسجلة.</p>
                ) : (
                  tabs.timelineEvents.map((evt: any) => (
                    <div key={evt.id} className="relative group">
                      {/* Node Bullet */}
                      <div className="absolute -right-[31px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-xs group-hover:scale-125 transition-transform" />
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 space-y-1 hover:bg-emerald-50/20 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-gray-400">{evt.date}</span>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {evt.type}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">{evt.title}</h4>
                        <p className="text-xs text-gray-600">{evt.subtitle}</p>
                        <div className="text-xs font-mono font-bold text-emerald-800 pt-1">
                          القيمة: {evt.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: STATISTICS */}
          {activeTab === "stats" && (
            <div className="bg-white border border-gray-200 rounded-b-2xl p-6 shadow-xs space-y-6">
              <h3 className="text-sm font-bold text-gray-900">
                المؤشرات والإحصائيات المالية للطرف
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <span className="text-xs text-gray-500 font-semibold block">إجمالي عدد الحركات</span>
                  <div className="text-2xl font-black text-gray-900 font-mono mt-1">
                    {tabs?.statistics?.totalTransactions || 0}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <span className="text-xs text-gray-500 font-semibold block">إجمالي حركات المدين</span>
                  <div className="text-2xl font-black text-rose-700 font-mono mt-1">
                    {tabs?.statistics?.totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <span className="text-xs text-gray-500 font-semibold block">إجمالي حركات الدائن</span>
                  <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                    {tabs?.statistics?.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <span className="text-xs text-gray-500 font-semibold block">أعلى قيمة معاملة فردية</span>
                  <div className="text-2xl font-black text-blue-900 font-mono mt-1">
                    {tabs?.statistics?.largestTransactionAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </div>
                </div>
              </div>

              {/* Breakdown by Type */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700">توزيع المعاملات حسب نوع الحركة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tabs?.statistics?.typeBreakdown?.map((item: any) => (
                    <div key={item.type} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-800 text-xs block">{item.type}</span>
                        <span className="text-[11px] text-gray-500">{item.count} حركات</span>
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-800">
                        {item.totalAmount.toLocaleString("en-US")} ج.م
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT LOG */}
          {activeTab === "audit" && (
            <div className="bg-white border border-gray-200 rounded-b-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  سجل الرقابة والتدقيق (Audit Trail)
                </h3>
                <span className="text-xs text-gray-500">سجل غير قابل للتعديل</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">نوع العملية</th>
                      <th className="p-3">البيان والشرح</th>
                      <th className="p-3">المعرف المرجعي</th>
                      <th className="p-3">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-sans">
                    {tabs?.auditLogs?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-400">
                          لا توجد سجلات تدقيق مسجلة.
                        </td>
                      </tr>
                    ) : (
                      tabs.auditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="p-3 font-mono text-gray-600">{log.performedAt}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {log.action}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-800 font-medium">{log.summary}</td>
                          <td className="p-3 font-mono text-gray-500">{log.entityId}</td>
                          <td className="p-3 text-gray-600 font-bold">{log.performedBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 space-y-3">
          <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">يرجى اختيار طرف لعرض كشف حسابه</h3>
          <p className="text-xs text-gray-400">
            حدد نوع الجهة والحساب من القائمة بالأعلى ثم اضغط "عرض الكشف".
          </p>
        </div>
      )}

      {/* Record Movement Modal matching Screenshots 1 & 2 */}
      <RecordMovementModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => {
          handleApplyFilter();
        }}
        initialPartyType={partyType}
        initialPartyId={partyId}
        initialPartyName={partyInfo?.partyName || ""}
        partiesList={partiesData}
        treasuries={partiesData.treasuryAccounts}
      />

      {/* Details Drawer */}
      <TransactionDetailsDrawer
        transaction={selectedTxnForDrawer}
        isOpen={!!selectedTxnForDrawer}
        onClose={() => setSelectedTxnForDrawer(null)}
        onReversalSuccess={() => {
          handleApplyFilter();
        }}
      />
    </div>
  );
}
