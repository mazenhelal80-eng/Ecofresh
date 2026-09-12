"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdvanceRepayment } from "@/actions/employees";
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
import { CheckCircle2, Coins, DollarSign, Loader2, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export interface RepayAdvanceDialogProps {
  employeeId: string;
  employeeName: string;
  outstandingAdvances: number;
  treasuryAccounts: Array<{ id: string; name: string; balance: number; currency: string }>;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function RepayAdvanceDialog({
  employeeId,
  employeeName,
  outstandingAdvances = 0,
  treasuryAccounts = [],
  trigger,
  onSuccess,
}: RepayAdvanceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(outstandingAdvances > 0 ? String(outstandingAdvances) : "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [treasuryAccountId, setTreasuryAccountId] = useState(
    treasuryAccounts.length > 0 ? treasuryAccounts[0].id : ""
  );
  const [notes, setNotes] = useState("");

  const numericAmount = parseFloat(amount) || 0;
  const isOverOutstanding = outstandingAdvances > 0 && numericAmount > outstandingAdvances;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!treasuryAccountId) {
      setError("يجب اختيار الخزينة أو الحساب البنكي المودع به السداد");
      setLoading(false);
      return;
    }

    if (isOverOutstanding) {
      setError(`مبلغ السداد أكبر من إجمالي السلف المتبقية (${formatCurrency(outstandingAdvances)})`);
      setLoading(false);
      return;
    }

    try {
      const res = await createAdvanceRepayment({
        employeeId,
        amount: numericAmount,
        treasuryAccountId,
        date,
        notes: notes || undefined,
      });

      if (!res.success) {
        const errorMsg = (res as any).error || ((res as any).errors ? Object.values((res as any).errors).flat().join(" - ") : "فشل قيد سداد السلفة");
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
          <Button variant="outline" size="sm" className="gap-1.5 font-bold border-blue-300 text-blue-900 bg-blue-50 hover:bg-blue-100">
            <CheckCircle2 className="h-4 w-4 text-blue-700" />
            + سداد سلفة
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-700" />
              <span>سداد سلفة: {employeeName}</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {employeeId}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
          <span className="text-blue-900 font-semibold">إجمالي السلف القائمة المطلوب سدادها:</span>
          <span className="font-mono font-bold text-blue-900 text-sm">
            {formatCurrency(outstandingAdvances)}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-right">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">مبلغ السداد (ج.م) *</Label>
              <Input
                type="number"
                min="0.01"
                max={outstandingAdvances > 0 ? outstandingAdvances : undefined}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className="text-sm font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">تاريخ التوريد *</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">الخزينة المودع بها المبلغ *</Label>
            <select
              value={treasuryAccountId}
              onChange={(e) => setTreasuryAccountId(e.target.value)}
              required
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-blue-600"
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
            <Label className="text-xs font-bold text-gray-700">البيان والملاحظات</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="سداد نقدي بخزينة الإدارة..."
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
              disabled={loading || numericAmount <= 0 || isOverOutstanding}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد سداد السلفة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
