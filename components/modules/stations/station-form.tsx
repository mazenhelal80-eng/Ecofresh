"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

import { StationSchema, type StationFormValues } from "@/lib/validations/station";
import { createStation } from "@/actions/stations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function StationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StationFormValues>({
    resolver: zodResolver(StationSchema),
    defaultValues: {
      name: "",
      location: "",
      coldStorageCapacityKg: 0,
      electricityRatePerKg: 0,
      supervisorName: "",
      phone: "",
    },
  });

  async function onSubmit(values: StationFormValues) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, val.toString());
        }
      });

      const res = await createStation(formData);
      if (res.success) {
        toast.success(res.message);
        router.push("/stations");
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
      toast.error("حدث خطأ غير متوقع أثناء حفظ بيانات المحطة");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm">
      <CardHeader className="bg-gradient-to-r from-emerald-900 to-[#012d1d] text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-white">إضافة محطة تجميد وتبريد جديد</CardTitle>
            <CardDescription className="text-emerald-100 text-xs mt-1">
              أدخل بيانات المحطة التشغيلية وسعتها التخزينية وتكلفة التبريد والكهرباء (يتم التكويد تلقائياً)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Station Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">اسم المحطة *</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: محطة النخيل" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">الموقع الجغرافي / المحافظة *</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: البحيرة - مركز كفر الدوار" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cold Storage Capacity */}
              <FormField
                control={form.control}
                name="coldStorageCapacityKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">السعة التخزينية القصوى (كجم) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="150000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Electricity Rate */}
              <FormField
                control={form.control}
                name="electricityRatePerKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">تعريفة التبريد/الكهرباء (ج.م/كجم) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="2.50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Supervisor Name */}
              <FormField
                control={form.control}
                name="supervisorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">اسم مشرف المحطة (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="م. أحمد محمود" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">رقم الهاتف (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="01012345678" dir="ltr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button asChild type="button" variant="outline" className="gap-2">
  <Link href="/stations">
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
                  "حفظ المحطة"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
