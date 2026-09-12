"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Users, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

import { CustomerSchema, type CustomerFormValues } from "@/lib/validations/customer";
import { createCustomer } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCY_CONFIG } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function CustomerForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: {
      name: "",
      country: "",
      currency: "EGP",
      contactPerson: "",
      phone: "",
      email: "",
    },
  });

  async function onSubmit(values: CustomerFormValues) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, val.toString());
        }
      });

      const res = await createCustomer(formData);
      if (res.success) {
        toast.success(res.message);
        router.push("/customers");
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
      toast.error("حدث خطأ غير متوقع أثناء تسجيل العميل");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm border-gray-200">
      <CardHeader className="bg-gradient-to-r from-emerald-900 to-[#012d1d] text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-white">إضافة عميل تصدير دولي جديد</CardTitle>
            <CardDescription className="text-emerald-100 text-xs mt-1">
              أدخل بيانات شركة الاستيراد والعملة وبيانات التواصل (يتم التكويد تلقائياً)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-semibold text-gray-700">اسم شركة العميل المستورد *</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: شركة سما للتجارة الدولية" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country */}
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">دولة المقر / الاستيراد *</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: هولندا / ألمانيا / السعودية" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency (Fixed Unified System: EGP) */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">عملة الحساب المعتمدة</FormLabel>
                    <FormControl>
                      <div className="flex h-10 w-full items-center rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-700 font-semibold cursor-not-allowed">
                        <span>{CURRENCY_CONFIG.nameAr} ({CURRENCY_CONFIG.code}) - {CURRENCY_CONFIG.symbol}</span>
                        <input type="hidden" {...field} value="EGP" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Person */}
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700">مسؤول التواصل</FormLabel>
                    <FormControl>
                      <Input placeholder="Mr. John Doe" value={field.value ?? ""} onChange={field.onChange} />
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
                    <FormLabel className="font-semibold text-gray-700">هاتف التواصل الدولي</FormLabel>
                    <FormControl>
                      <Input placeholder="+31 6 12345678" dir="ltr" value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="font-semibold text-gray-700">البريد الإلكتروني للشركة</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="import@company.com" dir="ltr" value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button asChild type="button" variant="outline" className="gap-2">
  <Link href="/customers">
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
                  "حفظ العميل"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
