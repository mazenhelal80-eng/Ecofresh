"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ClipboardList, Loader2, ArrowRight, Calculator } from "lucide-react";
import Link from "next/link";

import { ClientOrderSchema, type ClientOrderFormValues } from "@/lib/validations/client-order";
import { addClientOrder } from "@/actions/client-orders";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface CustomerOption {
  id: string;
  code: string;
  name: string;
  country: string;
  currency: string;
  agreements: Array<{
    id: number;
    productId: string;
    targetPriceEur: any;
    packagingSpec: string;
    product: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}

interface ProductOption {
  id: string;
  code: string;
  name: string;
  category?: string;
}

interface PackagingOption {
  id: string;
  code: string;
  name: string;
  category?: string;
  unit?: string;
  capacityKg?: any;
}

interface ClientOrderFormProps {
  customers: CustomerOption[];
  products?: ProductOption[];
  packaging?: PackagingOption[];
  defaultCustomerId?: string;
  initialData?: Partial<ClientOrderFormValues>;
}

export function ClientOrderForm({
  customers,
  products = [],
  packaging = [],
  defaultCustomerId,
  initialData,
}: ClientOrderFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialCustId = initialData?.customerId || defaultCustomerId || "";

  const form = useForm<ClientOrderFormValues>({
    resolver: zodResolver(ClientOrderSchema),
    defaultValues: {
      customerId: initialCustId,
      productName: initialData?.productName || "",
      packagingSpec: initialData?.packagingSpec || "",
      orderedQtyKg: initialData?.orderedQtyKg,
      unitPriceEur: initialData?.unitPriceEur,
      fxRate: 1.0,
      notes: initialData?.notes || "",
    },
  });

  const selectedCustomerId = form.watch("customerId");
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  const orderedQtyKg = Number(form.watch("orderedQtyKg")) || 0;
  const unitPriceEur = Number(form.watch("unitPriceEur")) || 0;

  const totalValueEgp = orderedQtyKg * unitPriceEur;

  async function onSubmit(values: ClientOrderFormValues) {
    setIsSubmitting(true);
    try {
      const res = await addClientOrder({ ...values, fxRate: 1.0 });
      if (res.success) {
        toast.success(res.message);
        router.push("/client-orders");
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
      toast.error("حدث خطأ غير متوقع أثناء تسجيل طلبية التصدير");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Live Financial Value Banner */}
      <Card className="bg-gradient-to-r from-[#012d1d] to-emerald-900 text-white shadow-md border-none">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <span className="text-xs text-emerald-200 block font-semibold">إجمالي قيمة الطلبية</span>
            <span className="text-3xl font-bold text-amber-300 mt-1 block">
              {formatCurrency(totalValueEgp)}
            </span>
            <span className="text-xs text-emerald-300 mt-1 block">
              طلب {orderedQtyKg.toLocaleString()} كجم بسعر {formatCurrency(unitPriceEur)} / كجم
            </span>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 md:border-r border-emerald-700/50 pt-3 md:pt-0 md:pr-6">
            <div className="text-right">
              <span className="text-xs text-emerald-200 block font-semibold">العملة المعتمدة</span>
              <span className="text-2xl font-bold text-cyan-300 mt-1 block">
                الجنيه المصري (EGP)
              </span>
              <span className="text-xs text-emerald-300">عملة موحدة للنظام المالي بالكامل</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
              <Calculator className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#012d1d] text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">تسجيل طلبية تصدير جديدة (Export Order)</CardTitle>
              <CardDescription className="text-xs text-gray-500">
                تسجيل طلبية العميل ورصد كميات الإيفاء والمواصفات التعاقدية
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Select */}
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-gray-700">عميل التصدير *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="" disabled>-- اختر عميل التصدير --</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.country})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Agreement Preset Select */}
                {selectedCustomer && selectedCustomer.agreements && selectedCustomer.agreements.length > 0 && (
                  <div className="md:col-span-2 p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                    <label className="block text-xs font-bold text-emerald-900 mb-1">
                      اختيار من الاتفاقيات السعرية المعتمدة للعميل:
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const agr = selectedCustomer.agreements.find((a) => a.id.toString() === e.target.value);
                        if (agr) {
                          form.setValue("productName", agr.product.name);
                          form.setValue("packagingSpec", agr.packagingSpec);
                          form.setValue("unitPriceEur", Number(agr.targetPriceEur));
                        }
                      }}
                      className="flex h-9 w-full rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs"
                    >
                      <option value="">-- اختر من الاتفاقيات السعرية المعتمدة (اختياري) --</option>
                      {selectedCustomer.agreements.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.product.name} — بسعر {formatCurrency(Number(a.targetPriceEur))} / كجم — ({a.packagingSpec})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Product Name Select */}
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">المنتج التصديري المطلوب من الكتالوج *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value || ""}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="" disabled>-- اختر الصنف التصديري --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({p.code}) — {p.category}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Packaging Spec Select */}
                <FormField
                  control={form.control}
                  name="packagingSpec"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">مواصفة التعبئة والتغليف من المستلزمات *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value || ""}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="" disabled>-- اختر مواصفة التعبئة والتغليف --</option>
                          {packaging.length > 0 ? (
                            packaging.map((pkg) => (
                              <option key={pkg.id} value={pkg.name}>
                                {pkg.name} ({pkg.code}) {pkg.capacityKg ? `[سعة ${pkg.capacityKg} كجم]` : ""}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="كرتونة تصدير 10 كجم">كرتونة تصدير 10 كجم</option>
                              <option value="كرتونة تصدير 15 كجم - تلسكوبيك">كرتونة تصدير 15 كجم - تلسكوبيك</option>
                              <option value="شيكارة 25 كجم">شيكارة 25 كجم</option>
                              <option value="أكياس 2.5 كجم داخل كرتونة 10 كجم">أكياس 2.5 كجم داخل كرتونة 10 كجم</option>
                              <option value="براميل 200 كجم">براميل 200 كجم</option>
                            </>
                          )}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Ordered Quantity Kg */}
                <FormField
                  control={form.control}
                  name="orderedQtyKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">الكمية المطلوبة (كجم) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="أدخل الكمية المطلوبة (كجم)"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unit Price EGP */}
                <FormField
                  control={form.control}
                  name="unitPriceEur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">
                        سعر بيع الكيلو (ج.م) *
                      </FormLabel>
                      <FormControl>
                        <CurrencyInput
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(val) => field.onChange(val)}
                          step="0.01"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />



                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-gray-700">ملاحظات وشروط خاصة بالطلبية</FormLabel>
                      <FormControl>
                        <Input placeholder="تعليمات الشحن والتغليف أو مواصفات الجودة الخاصة (اختياري)..." value={field.value ?? ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button asChild type="button" variant="outline" className="gap-2">
  <Link href="/client-orders">
                    <ArrowRight className="h-4 w-4" /> إلغاء
                  </Link>
</Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 min-w-[170px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> جاري تسجيل الطلبية...
                    </>
                  ) : (
                    "تسجيل طلبية التصدير"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
