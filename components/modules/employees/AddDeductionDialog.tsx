"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployeeDeduction } from "@/actions/employees";
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
import { AlertCircle, FileText, Loader2, MinusCircle, ShieldAlert } from "lucide-react";

export interface AddDeductionDialogProps {
  employeeId: string;
  employeeName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddDeductionDialog({
  employeeId,
  employeeName,
  trigger,
  onSuccess,
}: AddDeductionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [refDoc, setRefDoc] = useState("");

  const numericAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!reason || reason.trim().length < 3) {
      setError("يجب كتابة سبب الخصم الإداري بالتفصيل (3 أحرف على الأقل)");
      setLoading(false);
      return;
    }

    try {
      const res = await createEmployeeDeduction({
        employeeId,
        amount: numericAmount,
        reason: reason.trim(),
        date,
        refDoc: refDoc || undefined,
      });

      if (!res.success) {
        const errorMsg = (res as any).error || ((res as any).errors ? Object.values((res as any).errors).flat().join(" - ") : "فشل قيد الخصم الإداري");
        setError(errorMsg);
      } else {
        setOpen(false);
        setAmount("");
        setReason("");
        setRefDoc("");
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
          <Button variant="outline" size="sm" className="gap-1.5 font-bold border-rose-300 text-rose-900 bg-rose-50 hover:bg-rose-100">
            <MinusCircle className="h-4 w-4 text-rose-700" />
            + خصم إداري / جزاء
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MinusCircle className="h-5 w-5 text-rose-700" />
              <span>قيد خصم إداري / جزاء: {employeeName}</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {employeeId}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>حركة إدارية غير نقدية؛ سيتم تسجيل الخصم في كشف الحساب وخصمه من مسير الراتب.</span>
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
              <Label className="text-xs font-bold text-gray-700">مبلغ الخصم (ج.م) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250"
                className="text-sm font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">تاريخ الواقعة *</Label>
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
            <Label className="text-xs font-bold text-gray-700">سبب الخصم / الجزاء *</Label>
            <Input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="غياب بدون إذن / تأخير / إتلاف عهدة..."
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">رقم القرار / المرجع</Label>
            <Input
              value={refDoc}
              onChange={(e) => setRefDoc(e.target.value)}
              placeholder="قرار إداري رقم 14"
              className="text-sm font-mono"
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
              disabled={loading || numericAmount <= 0}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد قيد الخصم
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
