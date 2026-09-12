"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { processEmployeePayroll } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calculator, CheckCircle2, DollarSign, Loader2, Receipt, ShieldAlert, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export interface ProcessPayrollDialogProps {
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  outstandingAdvances: number;
  treasuryAccounts: Array<{ id: string; name: string; balance: number; currency: string }>;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ProcessPayrollDialog({
  employeeId,
  employeeName,
  basicSalary = 0,
  allowances = 0,
  outstandingAdvances = 0,
  treasuryAccounts = [],
  trigger,
  onSuccess,
}: ProcessPayrollDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [month, setMonth] = useState(currentMonthStr);

  const [bonusAmount, setBonusAmount] = useState("0");
  const [deductionAmount, setDeductionAmount] = useState("0");

  // Suggest advance deduction (up to 30% of salary or outstanding balance)
  const defaultAdvDeduction = outstandingAdvances > 0 ? Math.min(outstandingAdvances, Math.round((basicSalary + allowances) * 0.3)) : 0;
  const [advanceDeduction, setAdvanceDeduction] = useState(String(defaultAdvDeduction));

  const [treasuryAccountId, setTreasuryAccountId] = useState(
    treasuryAccounts.length > 0 ? treasuryAccounts[0].id : ""
  );
  const [notes, setNotes] = useState("");

  const numBonus = parseFloat(bonusAmount) || 0;
  const numDeduction = parseFloat(deductionAmount) || 0;
  const numAdvDeduction = parseFloat(advanceDeduction) || 0;

  const grossEarnings = basicSalary + allowances + numBonus;
  const totalDeductions = numDeduction + numAdvDeduction;
  const netPayable = Math.max(0, grossEarnings - totalDeductions);

  const selectedAccount = treasuryAccounts.find((a) => a.id === treasuryAccountId);
  const isOverdraft = selectedAccount && netPayable > Number(selectedAccount.balance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!treasuryAccountId) {
      setError("يجب تحديد الخزينة أو الحساب البنكي لصرف صافي الراتب");
      setLoading(false);
      return;
    }

    if (isOverdraft) {
      setError("رصيد الخزينة المحددة لا يكفي لصرف صافي الراتب المستحق");
      setLoading(false);
      return;
    }

    if (numAdvDeduction > outstandingAdvances) {
      setError(`قسط السلفة المخصوم (${formatCurrency(numAdvDeduction)}) أكبر من إجمالي السلف القائمة (${formatCurrency(outstandingAdvances)})`);
      setLoading(false);
      return;
    }

    try {
      const res = await processEmployeePayroll({
        employeeId,
        month,
        basicSalary,
        allowances,
        bonusAmount: numBonus,
        deductionAmount: numDeduction,
        advanceDeduction: numAdvDeduction,
        netAmount: netPayable,
        treasuryAccountId,
        notes: notes || undefined,
      });

      if (!res.success) {
        const errorMsg = (res as any).error || ((res as any).errors ? Object.values((res as any).errors).flat().join(" - ") : "فشل اعتماد وصرف مسير الراتب");
        setError(errorMsg);
      } else {
        setOpen(false);
        router.refresh();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1.5 shadow-sm">
            <Calculator className="h-4 w-4" />
            + صرف مسير الراتب
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[580px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-700" />
              <span>احتساب وصرف الراتب: {employeeName}</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {employeeId}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-right">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">شهر الاستحقاق والصرف *</Label>
            <Input
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="text-sm font-mono"
            />
          </div>

          {/* Master Salary Components */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500 block mb-0.5">الراتب الأساسي التعاقدي</span>
              <strong className="font-mono text-gray-900 text-sm">{formatCurrency(basicSalary)}</strong>
            </div>
            <div>
              <span className="text-gray-500 block mb-0.5">البدلات الشهرية الثابتة</span>
              <strong className="font-mono text-gray-900 text-sm">{formatCurrency(allowances)}</strong>
            </div>
          </div>

          {/* Variable Additions & Deductions */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-emerald-700">مكافآت / حوافز (+)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                className="text-sm font-mono font-bold text-emerald-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-rose-700">خصومات وجزاءات (-)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={deductionAmount}
                onChange={(e) => setDeductionAmount(e.target.value)}
                className="text-sm font-mono font-bold text-rose-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-amber-700">قسط سلفة مخصوم (-)</Label>
              <Input
                type="number"
                min="0"
                max={outstandingAdvances}
                step="0.01"
                value={advanceDeduction}
                onChange={(e) => setAdvanceDeduction(e.target.value)}
                className="text-sm font-mono font-bold text-amber-800"
              />
            </div>
          </div>

          {outstandingAdvances > 0 && (
            <div className="text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded-lg border border-amber-200 flex justify-between items-center">
              <span>إجمالي السلف القائمة على الموظف:</span>
              <span className="font-mono font-bold">{formatCurrency(outstandingAdvances)}</span>
            </div>
          )}

          {/* Net Payroll Calculation Result Banner */}
          <div className="p-4 bg-gradient-to-r from-[#012d1d] to-[#02472e] text-white rounded-xl space-y-1 shadow-sm">
            <div className="flex justify-between items-center text-xs text-emerald-200">
              <span>إجمالي الاستحقاق: {formatCurrency(grossEarnings)}</span>
              <span>إجمالي الاستقطاعات: {formatCurrency(totalDeductions)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-700/60">
              <span className="font-bold text-sm">صافي الراتب المستحق للصرف:</span>
              <span className="font-mono font-bold text-xl text-white">
                {formatCurrency(netPayable)}
              </span>
            </div>
          </div>

          {/* Treasury Account Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">الخزينة أو الحساب البنكي للصرف *</Label>
            <select
              value={treasuryAccountId}
              onChange={(e) => setTreasuryAccountId(e.target.value)}
              required
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-600"
            >
              {treasuryAccounts.length === 0 && (
                <option value="">لا توجد حسابات خزينة نشطة</option>
              )}
              {treasuryAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — ({formatCurrency(Number(acc.balance))})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">ملاحظات مسير الراتب</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="تم صرف راتب الشهر بعد استقطاع قسط السلفة..."
              className="text-sm"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={loading || netPayable <= 0 || isOverdraft}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              اعتماد وصرف الراتب
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
