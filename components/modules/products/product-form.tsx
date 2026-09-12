"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/actions/products";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Package, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export function ProductForm() {
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
      const res = await createProduct(formData);
      if (res.success) {
        router.push("/products");
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
            <Package className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">إضافة صنف تصديري جديد</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              كتالوج المنتجات التصديرية وتحديد نسب الهالك والتصافي المعيارية
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
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                اسم المنتج بالعربية <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="مثال: فراولة مجمدة IQF"
                required
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Product Export Code */}
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-semibold text-gray-700">
                كود الصنف التصديري <span className="text-gray-400 font-normal">(اختياري)</span>
              </Label>
              <Input
                id="code"
                name="code"
                placeholder="مثال: PRD-STW-IQF (تلقائي إن تُرِك فارغاً)"
                className="font-mono uppercase"
              />
              {fieldErrors.code && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.code[0]}</p>
              )}
            </div>
          </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                التصنيف <span className="text-red-500">*</span>
              </Label>
              <select
                id="category"
                name="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="فواكه مجمدة">فواكه مجمدة</option>
                <option value="خضار مجمد">خضار مجمد</option>
              </select>
              {fieldErrors.category && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.category[0]}</p>
              )}
            </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Default Unit */}
            <div className="space-y-2">
              <Label htmlFor="defaultUnit" className="text-sm font-semibold text-gray-700">
                الوحدة الافتراضية <span className="text-red-500">*</span>
              </Label>
              <Input
                id="defaultUnit"
                name="defaultUnit"
                defaultValue="KG"
                className="font-mono"
                required
              />
              {fieldErrors.defaultUnit && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.defaultUnit[0]}</p>
              )}
            </div>

            {/* Standard Waste % */}
            <div className="space-y-2">
              <Label htmlFor="standardWastePct" className="text-sm font-semibold text-gray-700">
                نسبة الهالك المعيارية (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="standardWastePct"
                name="standardWastePct"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue="20.0"
                required
              />
              {fieldErrors.standardWastePct && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.standardWastePct[0]}</p>
              )}
            </div>

            {/* Standard Yield % */}
            <div className="space-y-2">
              <Label htmlFor="standardYieldPct" className="text-sm font-semibold text-gray-700">
                نسبة التصافي المعيارية (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="standardYieldPct"
                name="standardYieldPct"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue="80.0"
                required
              />
              {fieldErrors.standardYieldPct && (
                <p className="text-xs text-red-500 font-medium">{fieldErrors.standardYieldPct[0]}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-amber-50/70 p-3 text-xs text-amber-800 border border-amber-200/60 font-medium">
            💡 ملاحظة: يجب ألا يتجاوز مجموع (نسبة الهالك المعيارية + نسبة التصافي المعيارية) 100%.
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 py-4">
          <Button asChild type="button" variant="outline" size="sm" className="gap-1.5">
  <Link href="/products">
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
              "حفظ وتسجيل المنتج"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
