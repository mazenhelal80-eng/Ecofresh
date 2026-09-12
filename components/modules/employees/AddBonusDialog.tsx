"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployeeBonus } from "@/actions/employees";
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
import { Award, DollarSign, Gift, Loader2, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export interface AddBonusDialogProps {
  employeeId: string;
  employeeName: string;
  treasuryAccounts: Array<{ id: string; name: string; balance: number; currency: string }>;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddBonusDialog({
  employeeId,
  employeeName,
  treasuryAccounts = [],
  trigger,
  onSuccess,
}: AddBonusDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("مكافأة");
  const [amount, setAmount] = useState("");
  const [payoutMode, setPayoutMode] = useState<"immediate" | "with_salary">("with_salary");
  const [treasuryAccountId, setTreasuryAccountId] = useState(
    treasuryAccounts.length > 0 ? treasuryAccounts[0].id : ""
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const numericAmount = parseFloat(amount) || 0;
  const selectedAccount = treasuryAccounts.find((a) => a.id === treasuryAccountId);
  const isOverdraft = payoutMode === "immediate" && selectedAccount && numericAmount > Number(selectedAccount.balance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (payoutMode === "immediate" && !treasuryAccountId) {
      setError("يجب تحديد الخزينة للصرف الفوري للمكافأة");
      setLoading(false);
      return;
    }

    if (isOverdraft) {
      setError("رصيد الخزينة المحددة لا يكفي لإتمام عملية الصرف");
      setLoading(false);
      return;
    }

    try {
      const res = await createEmployeeBonus({
        employeeId,
        amount: numericAmount,
        type,
        treasuryAccountId: payoutMode === "immediate" ? treasuryAccountId : undefined,
        date,
        notes: notes || "مكافأة تميز وإنجاز",
      });

      if (!res.success) {
        const errorMsg = (res as any).error || ((res as any).errors ? Object.values((res as any).errors).flat().join(" - ") : "فشل قيد المكافأة");
        setError(errorMsg);
      } else {
        setOpen(false);
        setAmount("");
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
          <Button variant="outline" size="sm" className="gap-1.5 font-bold border-purple-300 text-purple-900 bg-purple-50 hover:bg-purple-100">
            <Award className="h-4 w-4 text-purple-700" />
            + مكافأة / بدل إضافي
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-700" />
              <span>إضافة مكافأة / بدل: {employeeName}</span>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">النوع *</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-purple-600"
              >
                <option value="مكافأة">مكافأة تشجيعية</option>
                <option value="بدل انتقال">بدل انتقال / سفر</option>
                <option value="بدل إضافي">بدل عمل إضافي (Overtime)</option>
                <option value="مكافأة إنتاج">حافز إنتاج موسمي</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">المبلغ (ج.م) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500"
                className="text-sm font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">طريقة الاستحقاق / الصرف *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayoutMode("with_salary")}
                className={`p-2.5 rounded-lg border text-xs font-bold text-right transition-colors ${
                  payoutMode === "with_salary"
                    ? "border-purple-600 bg-purple-50 text-purple-900"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                تضاف لراتب الشهر القادم
              </button>
              <button
                type="button"
                onClick={() => setPayoutMode("immediate")}
                className={`p-2.5 rounded-lg border text-xs font-bold text-right transition-colors ${
                  payoutMode === "immediate"
                    ? "border-purple-600 bg-purple-50 text-purple-900"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                صرف فوري من الخزينة
              </button>
            </div>
          </div>

          {payoutMode === "immediate" && (
            <div className="space-y-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <Label className="text-xs font-bold text-gray-700">الخزينة المصدرة للصرف *</Label>
              <select
                value={treasuryAccountId}
                onChange={(e) => setTreasuryAccountId(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-purple-600"
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
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">تاريخ الحركة *</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">بيان وأسباب التكريم / البدل</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="جهود متميزة في تجهيز خط الفراولة..."
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
              disabled={loading || numericAmount <= 0 || (isOverdraft && payoutMode === "immediate")}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد قيد المكافأة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
