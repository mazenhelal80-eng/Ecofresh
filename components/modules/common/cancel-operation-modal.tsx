"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cancelProcessingOperation } from "@/actions/processing";
import { cancelStockTransfer } from "@/actions/transfers";
import { cancelShipment } from "@/actions/shipments";
import { cancelDirectPurchaseDeal } from "@/actions/direct-deals";

export type OperationType = "processing" | "transfer" | "shipment" | "direct-deal";

interface CancelOperationModalProps {
  operationType: OperationType;
  operationId: string;
  operationLabel: string;
  trigger?: React.ReactNode;
  isDisabled?: boolean;
  disabledReason?: string;
}

export function CancelOperationModal({
  operationType,
  operationId,
  operationLabel,
  trigger,
  isDisabled = false,
  disabledReason,
}: CancelOperationModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const getTitle = () => {
    switch (operationType) {
      case "processing":
        return "إلغاء وعكس عملية الإنتاج والفرز";
      case "transfer":
        return "إلغاء وعكس التحويل المخزني بين المحطات";
      case "shipment":
        return "إلغاء وعكس شحنة التصدير";
      case "direct-deal":
        return "إلغاء وعكس صفقة شراء محصول جاهز";
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isPending) return;
    setOpen(newOpen);
    if (!newOpen) {
      setCancelReason("");
      setValidationError(null);
      setServerError(null);
    }
  };

  const handleConfirm = () => {
    setValidationError(null);
    setServerError(null);

    const trimmedReason = cancelReason.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      setValidationError("يرجى إدخال سبب الإلغاء بالتفصيل (5 أحرف على الأقل)");
      return;
    }

    startTransition(async () => {
      let res: { success: boolean; message?: string; error?: string };

      if (operationType === "processing") {
        res = await cancelProcessingOperation(operationId, trimmedReason);
      } else if (operationType === "transfer") {
        res = await cancelStockTransfer(operationId, trimmedReason);
      } else if (operationType === "shipment") {
        res = await cancelShipment(operationId, trimmedReason);
      } else if (operationType === "direct-deal") {
        res = await cancelDirectPurchaseDeal(operationId, trimmedReason);
      } else {
        res = { success: false, error: "نوع العملية غير معروف" };
      }

      if (res.success) {
        setOpen(false);
        setCancelReason("");
      } else {
        setServerError(res.error || "حدث خطأ غير متوقع أثناء الإلغاء");
      }
    });
  };

  if (isDisabled && disabledReason) {
    return (
      <span className="text-xs text-gray-400 font-sans cursor-not-allowed select-none border border-gray-200 px-2 py-1 rounded bg-gray-50 inline-flex items-center gap-1">
        🚫 {disabledReason}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            disabled={isDisabled}
            className="border-red-200 text-[#ba1a1a] hover:bg-red-50 hover:border-red-300 font-bold text-xs h-7 px-2.5 gap-1 shadow-sm"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            إلغاء العملية
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-[#500px] border-red-200" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#ba1a1a]">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <DialogTitle className="text-lg font-bold text-gray-900">
              {getTitle()}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-gray-600 mt-1">
            أنت على وشك إلغاء وعكس الأثر المخزني والمالي لـ:{" "}
            <strong className="text-gray-900 font-mono text-sm block mt-1 bg-gray-100 p-1.5 rounded border border-gray-200">
              {operationLabel}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning Banner */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-[#ba1a1a] font-bold flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              هذا الإجراء نهائي ولا يمكن التراجع عنه. سيؤدي هذا إلى إعادة ضبط الأرصدة وعكس كافة القيود المالية المرتبطة بالعملية فوراً.
            </span>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 block">
              سبب الإلغاء (مطلوب) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                setCancelReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="اكتب سبب الإلغاء بالتفصيل (مثال: خطأ في إدخال أوزان التشغيلة / تعديل الكمية المجهزة)..."
              rows={3}
              className="w-full rounded-md border border-gray-300 p-2 text-xs focus:border-[#ba1a1a] focus:ring-[#ba1a1a] outline-none"
            />
            {validationError && (
              <p className="text-[11px] font-bold text-[#ba1a1a]">
                {validationError}
              </p>
            )}
          </div>

          {/* Server Error Message Display */}
          {serverError && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-xs font-bold text-red-900">
              {serverError}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-row-reverse">
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-[#ba1a1a] hover:bg-red-800 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري تنفيذ الإلغاء والعكس...
              </>
            ) : (
              "تأكيد الإلغاء النهائى"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="text-xs font-semibold text-gray-700"
          >
            تراجع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
