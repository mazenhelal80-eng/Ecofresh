"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContractor } from "@/actions/contractors";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HardHat, Building2, DollarSign, Phone, FileText, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

interface ContractorFormProps {
  stations?: Array<{ id: string; name: string; location: string }>;
}

export function ContractorForm({ stations }: ContractorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createContractor(formData);
      if (res.success) {
        router.push("/contractors");
        router.refresh();
      } else {
        if (res.errors) {
          setFieldErrors(res.errors);
        } else if (res.error) {
          setError(res.error);
        }
      }
    });
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm border-gray-200">
      <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">تسجيل مقاول عمالة جديد</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              إدخال بيانات مقاول الفرز والتجهيز وتعريفة الأتعاب (مقاول مستقل يعمل عبر مختلف محطات التشغيل)
            </p>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 pt-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200 font-medium">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Contractor Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                اسم المقاول / الشركة <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="مثال: مقاول أحمد للتجهيز"
                required
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Tariff Rate per Kg */}
            <div className="space-y-2">
              <Label htmlFor="tariffRatePerKg" className="text-sm font-semibold text-gray-700">
                تعريفة الفرز والتجهيز (ج.م/كجم) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="tariffRatePerKg"
                  name="tariffRatePerKg"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="مثال: 2.00"
                  required
                />
              </div>
              {fieldErrors.tariffRatePerKg && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.tariffRatePerKg[0]}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                رقم الهاتف (اختياري)
              </Label>
              <Input
                id="phone"
                name="phone"
                placeholder="01000000000"
                dir="ltr"
                className="text-right"
              />
              {fieldErrors.phone && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.phone[0]}</p>
              )}
            </div>

            {/* Specialization */}
            <div className="space-y-2">
              <Label htmlFor="specialization" className="text-sm font-semibold text-gray-700">
                التخصص (اختياري)
              </Label>
              <Input
                id="specialization"
                name="specialization"
                placeholder="مثال: فرز وتجهيز وتجميد خضروات"
              />
              {fieldErrors.specialization && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.specialization[0]}</p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 py-4">
          <Button asChild type="button" variant="outline" size="sm" className="gap-1.5">
  <Link href="/contractors">
              <ArrowRight className="h-4 w-4" />
              إلغاء وعودة
            </Link>
</Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ وتسجيل المقاول"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
