"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployeeAdvance } from "@/actions/employees";
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
import { AlertCircle, Calendar, CreditCard, DollarSign, HandCoins, Loader2, ShieldAlert, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export interface AddAdvanceDialogProps {
  employeeId: string;
  employeeName: string;
  monthlySalary?: number;
  treasuryAccounts: Array<{ id: string; name: string; balance: number; currency: string }>;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddAdvanceDialog({
  employeeId,
  employeeName,
  monthlySalary = 0,
  treasuryAccounts = [],
  trigger,
  onSuccess,
}: AddAdvanceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [treasuryAccountId, setTreasuryAccountId] = useState(
    treasuryAccounts.length > 0 ? treasuryAccounts[0].id : ""
  );
  const [notes, setNotes] = useState("");

  const numericAmount = parseFloat(amount) || 0;
  const numInstallments = parseInt(installmentsCount, 10) || 1;
  const monthlyInstallment = numInstallments > 0 ? Math.round(numericAmount / numInstallments) : numericAmount;

  const selectedAccount = treasuryAccounts.find((a) => a.id === treasuryAccountId);
  const isOverdraft = selectedAccount && numericAmount > Number(selectedAccount.balance);
  const isOverSalary = monthlySalary > 0 && numericAmount > monthlySalary;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!treasuryAccountId) {
      setError("يجب اختيار الخزينة أو الحساب البنكي لصرف السلفة");
      setLoading(false);
      return;
    }

    if (isOverdraft) {
      setError("رصيد الخزينة المحددة لا يكفي لإتمام عملية الصرف");
      setLoading(false);
      return;
    }

    try {
      const res = await createEmployeeAdvance({
        employeeId,
        amount: numericAmount,
        installmentsCount: numInstallments,
        treasuryAccountId,
        date,
        notes: notes || undefined,
      });

      if (!res.success) {
        const errorMsg = (res as any).error || ((res as any).errors ? Object.values((res as any).errors).flat().join(" - ") : "فشل قيد السلفة");
        setError(errorMsg);
      } else {
        setOpen(false);
        setAmount("");
        setInstallmentsCount("1");
        setNotes("");
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
          <Button variant="outline" size="sm" className="gap-1.5 font-bold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100">
            <HandCoins className="h-4 w-4 text-amber-700" />
            + طلب سلفة
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-amber-700" />
              <span>صرف سلفة للموظف: {employeeName}</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {employeeId}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {monthlySalary > 0 && (
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs flex items-center justify-between">
            <span className="text-gray-600 font-semibold">الراتب الشهري للموظف:</span>
            <span className="font-mono font-bold text-gray-900">{formatCurrency(monthlySalary)}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-right">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">مبلغ السلفة (ج.م) *</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="3000"
                className="text-sm font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">عدد شهور السداد (الأقساط) *</Label>
              <select
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:border-amber-600"
              >
                <option value="1">شهر واحد (دفعة واحدة)</option>
                <option value="2">شهران (قسطان)</option>
                <option value="3">3 أشهر (3 أقساط)</option>
                <option value="4">4 أشهر</option>
                <option value="5">5 أشهر</option>
                <option value="6">6 أشهر</option>
                <option value="10">10 أشهر</option>
                <option value="12">سنة كاملة (12 قسط)</option>
              </select>
            </div>
          </div>

          {/* Installment breakdown card */}
          {numericAmount > 0 && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-900 font-semibold">قيمة القسط الشهري المتوقع:</span>
                <span className="font-mono font-bold text-amber-900 text-sm">
                  {formatCurrency(monthlyInstallment)} / شهر
                </span>
              </div>
              <p className="text-[11px] text-amber-700">
                سيتم خصم القسط تلقائياً عند اعتماد مسير الرواتب الشهري أو إمكانية السداد النقدي المسبق.
              </p>
            </div>
          )}

          {isOverSalary && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>تنبيه: إجمالي السلفة المطلوب يتجاوز الراتب الأساسي والبدلات الشهرية للموظف.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">الخزينة المصدرة للصرف *</Label>
            <select
              value={treasuryAccountId}
              onChange={(e) => setTreasuryAccountId(e.target.value)}
              required
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-amber-600"
            >
              {treasuryAccounts.length === 0 && (
                <option value="">لا توجد حسابات خزينة نشطة</option>
              )}
              {treasuryAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — (الرصيد: {formatCurrency(Number(acc.balance))})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">تاريخ الصرف *</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">سبب السلفة / ملاحظات</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ظروف عائلية / علاج..."
                className="text-sm"
              />
            </div>
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
              disabled={loading || isOverdraft || numericAmount <= 0}
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              صرف السلفة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
