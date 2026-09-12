"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Boxes, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

import { SupplySchema, type SupplyFormValues } from "@/lib/validations/supply";
import { createSupply } from "@/actions/supplies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface StationOption {
  id: string;
  name: string;
  location?: string;
}

interface SupplyFormProps {
  stations?: StationOption[];
}

export function SupplyForm({ stations = [] }: SupplyFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupplyFormValues>({
    resolver: zodResolver(SupplySchema),
    defaultValues: {
      code: "",
      name: "",
      category: "كرتونة",
      capacityKg: undefined,
      unit: "كرتونة",
      stock: 0,
      unitPrice: 0,
      stationId: "",
    },
  });

  const categoryValue = form.watch("category");

  async function onSubmit(values: SupplyFormValues) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, val.toString());
        }
      });

      const res = await createSupply(formData);
      if (res.success) {
        toast.success(res.message);
        router.push("/supplies");
        router.refresh();
      } else {
        if (res.errors) {
          Object.entries(res.errors).forEach(([key, errs]) => {
            if (errs && errs[0]) {
              form.setError(key as any, { message: errs[0] });
            }
          });
        }
        if (res.error) {
          toast.error(res.error);
        }
      }
    } catch (err) {
      toast.error("حدث خطأ غير متوقع أثناء حفظ بيانات المستلزم");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm border-gray-200">
      <CardHeader className="bg-gradient-to-r from-emerald-900 to-[#012d1d] text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-white">إضافة مستلزم تعبئة وتغليف جديد</CardTitle>
            <CardDescription className="text-emerald-100 text-xs mt-1">
              أدخل تكويد كرتونة أو أكياس ومستلزمات التغليف ورصيد الشراء الأول (يتم التكويد تلقائياً)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code (Optional) */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-semibold text-gray-700">كود المستلزم التصديري (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: CTN-EXP-5K (أو اتركه فارغاً للتوليد التلقائي)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-semibold text-gray-700">اسم المستلزم بالعربية *</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: كرتونة تصدير 5 كجم" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">الفئة *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="كرتونة">كرتونة</option>
                        <option value="أكياس">أكياس</option>
                        <option value="بالتات">بالتات</option>
                        <option value="لاصق">لاصق</option>
                        <option value="تغليف">تغليف</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Capacity Kg */}
              <FormField
                control={form.control}
                name="capacityKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">
                      سعة التعبئة (كجم) {categoryValue === "كرتونة" ? "*" : "(اختياري)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="10.0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit */}
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">وحدة القياس *</FormLabel>
                    <FormControl>
                      <Input placeholder="كرتونة / كيس / باليتة / بكرة / رول" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stock */}
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">رصيد المخزون الأولي</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="2000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Station for Initial Stock */}
              <FormField
                control={form.control}
                name="stationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">محطة استلام الرصيد الأولي</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value || ""}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">اختر المحطة (افتراضي: أول محطة نشطة)</option>
                        {stations.map((stn) => (
                          <option key={stn.id} value={stn.id}>
                            {stn.name} ({stn.id})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Price */}
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-semibold text-gray-700">سعر الوحدة الشراء (ج.م) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="18.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button asChild type="button" variant="outline" className="gap-2">
  <Link href="/supplies">
                  <ArrowRight className="h-4 w-4" /> إلغاء
                </Link>
</Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ...
                  </>
                ) : (
                  "حفظ المستلزم"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
