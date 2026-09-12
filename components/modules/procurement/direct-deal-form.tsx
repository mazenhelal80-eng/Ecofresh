"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PackageCheck, Loader2, ArrowRight, Calculator, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";

import { DirectDealSchema, type DirectDealFormValues } from "@/lib/validations/purchases";
import { addDirectPurchaseDeal } from "@/actions/direct-deals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface SupplierOption {
  id: string;
  code: string;
  name: string;
  type?: string;
}

interface StationOption {
  id: string;
  name: string;
  location?: string;
}

interface ProductOption {
  id: string;
  code: string;
  name: string;
  category?: string;
  defaultUnit?: string;
}

interface PackagingOption {
  id: string;
  code: string;
  name: string;
  category?: string;
  unit?: string;
  capacityKg?: any;
}

interface TreasuryAccountOption {
  id: string;
  name: string;
  balance: any;
  currency: string;
  type?: string;
}

interface DirectDealFormProps {
  suppliers: SupplierOption[];
  stations: StationOption[];
  products?: ProductOption[];
  packagingSupplies?: PackagingOption[];
  treasuryAccounts?: TreasuryAccountOption[];
  defaultStationId?: string;
  defaultSupplierId?: string;
  initialData?: Partial<DirectDealFormValues>;
}

export function DirectDealForm({
  suppliers,
  stations,
  products = [],
  packagingSupplies = [],
  treasuryAccounts = [],
  defaultStationId,
  defaultSupplierId,
  initialData,
}: DirectDealFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId] = useState(() => 'SUB-DEAL-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7));

  const form = useForm<DirectDealFormValues>({
    resolver: zodResolver(DirectDealSchema),
    defaultValues: {
      submissionId,
      date: initialData?.date || new Date().toISOString().split('T')[0],
      supplierId: initialData?.supplierId || defaultSupplierId || "",
      stationId: initialData?.stationId || defaultStationId || "",
      productName: initialData?.productName || "",
      qtyKg: initialData?.qtyKg,
      purchasePricePerKg: initialData?.purchasePricePerKg,
      transportCost: initialData?.transportCost ?? 0,
      isPaidNow: initialData?.isPaidNow ?? false,
      paidAmount: initialData?.paidAmount ?? 0,
      treasuryAccountId: initialData?.treasuryAccountId || "",
      packageType: initialData?.packageType || "",
      packageCount: initialData?.packageCount ?? null,
      notes: initialData?.notes || "",
      invoiceNo: initialData?.invoiceNo || "",
    },
  });

  const qtyKg = Number(form.watch("qtyKg")) || 0;
  const purchasePricePerKg = Number(form.watch("purchasePricePerKg")) || 0;
  const transportCost = Number(form.watch("transportCost")) || 0;
  const isPaidNow = form.watch("isPaidNow");
  const paidAmount = Number(form.watch("paidAmount")) || 0;

  const rawCost = qtyKg * purchasePricePerKg;
  const totalCost = rawCost + transportCost;
  const effectiveCostPerKg = qtyKg > 0 ? totalCost / qtyKg : 0;
  const effectivePaid = isPaidNow ? paidAmount : 0;
  const remainingPayable = Math.max(0, totalCost - effectivePaid);

  async function onSubmit(values: DirectDealFormValues) {
    setIsSubmitting(true);
    try {
      const res = await addDirectPurchaseDeal(values);
      if (res.success) {
        toast.success(res.message);
        router.push("/finished-purchases");
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
      toast.error("حدث خطأ غير متوقع أثناء حفظ صفقة الجاهز المباشرة");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Live Total & Cost per Kg Banner */}
      <Card className="bg-gradient-to-r from-[#012d1d] to-emerald-900 text-white shadow-md border-none">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <span className="text-xs text-emerald-200 block font-semibold">إجمالي تكلفة الصفقة (EGP)</span>
            <span className="text-2xl font-bold text-amber-300 mt-1 block font-mono">
              {totalCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              ج.م
            </span>
            <span className="text-xs text-emerald-300 mt-1 block">
              شراء {qtyKg.toLocaleString()} كجم (بضاعة: {rawCost.toLocaleString()} + نولون: {transportCost.toLocaleString()})
            </span>
          </div>

          <div className="border-t md:border-t-0 md:border-r md:border-l border-emerald-700/50 pt-3 md:pt-0 md:px-4 text-right">
            <span className="text-xs text-emerald-200 block font-semibold">
              {isPaidNow && effectivePaid > 0 ? "حالة السداد والمتبقي" : "مستحق آجل للمورد"}
            </span>
            <div className="mt-1">
              {isPaidNow ? (
                <>
                  <span className="text-lg font-bold text-white block font-mono">
                    <span className="text-emerald-300">{effectivePaid.toLocaleString()} ج.م</span> مسدد
                  </span>
                  <span className="text-xs text-amber-200 block font-mono mt-0.5">
                    متبقي للمورد: {remainingPayable.toLocaleString()} ج.م
                  </span>
                </>
              ) : (
                <span className="text-sm font-bold text-amber-200 block font-mono">
                  {totalCost.toLocaleString()} ج.م (آجل بالكامل)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 md:pr-4">
            <div className="text-right">
              <span className="text-xs text-emerald-200 block font-semibold">التكلفة الإجمالية للكيلو</span>
              <span className="text-2xl font-bold text-cyan-300 mt-1 block font-mono">
                {effectiveCostPerKg.toFixed(2)} ج.م / كجم
              </span>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#012d1d] text-[#00e396]">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">تسجيل صفقة شراء محصول جاهز مباشرة</CardTitle>
              <CardDescription className="text-xs text-gray-500">
                تسجيل شراء بضاعة مجهزة ومعبأة جاهزة للتصدير من مورد خارجي وتحويلها للمحطة
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Input */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700 flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-emerald-800" /> تاريخ إبرام / استلام الصفقة *
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Invoice No */}
                <FormField
                  control={form.control}
                  name="invoiceNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">رقم الفاتورة / إيصال التوريد</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: INV-DIR-2026-001 (اختياري)" value={field.value ?? ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Product Name Select */}
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-gray-700">الصنف التصديري المعتمد بالسيستم *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value || ""}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="" disabled>-- اختر الصنف من كتالوج المنتجات المعرفة --</option>
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

                {/* Supplier */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-gray-700">المورد الخارجي / تاجر الجاهز *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="" disabled>-- اختر المورد الخارجي / تاجر الجاهز --</option>
                          {suppliers.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.name} ({sup.code}) {sup.type === "FINISHED_GOODS" ? "— [مورد بضاعة جاهزة]" : ""}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Destination Station */}
                <FormField
                  control={form.control}
                  name="stationId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-gray-700">محطة الاستلام والتخزين (مخزن المنتج التام) *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="" disabled>-- اختر محطة الاستلام والتخزين --</option>
                          {stations.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name} {st.location ? `(${st.location})` : ""}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantity Kg */}
                <FormField
                  control={form.control}
                  name="qtyKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">الكمية الصافية بالكيلوجرام (كجم) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="أدخل الكمية بالكيلوجرام (يقبل كسور)"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price Per Kg */}
                <FormField
                  control={form.control}
                  name="purchasePricePerKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">سعر شراء الكيلو من المورد (ج.م) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Packaging Type Select */}
                <FormField
                  control={form.control}
                  name="packageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">نوع العبوة / التعبئة (اختياري)</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            const matchedSupply = packagingSupplies.find((s) => s.name === e.target.value);
                            if (matchedSupply && matchedSupply.capacityKg && qtyKg > 0) {
                              const cap = Number(matchedSupply.capacityKg);
                              if (cap > 0) {
                                form.setValue("packageCount", Math.ceil(qtyKg / cap));
                              }
                            }
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">-- اختر نوع العبوة من دليل المستلزمات --</option>
                          {packagingSupplies.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name} ({s.code}) {s.capacityKg ? `[سعة: ${s.capacityKg} كجم]` : ""}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transportation Cost */}
                <FormField
                  control={form.control}
                  name="transportCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">تكلفة النقل والنولون (ج.م)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="0.00 (اختياري)"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Instant Payment Section */}
                <div className="md:col-span-2 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isPaidNow"
                        checked={Boolean(isPaidNow)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          form.setValue("isPaidNow", checked);
                          if (checked && (!form.getValues("paidAmount") || form.getValues("paidAmount") === 0)) {
                            form.setValue("paidAmount", totalCost);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
                      />
                      <label htmlFor="isPaidNow" className="font-bold text-sm text-emerald-950 cursor-pointer flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-emerald-700" />
                        تسجيل سداد فوري من الخزينة / البنك (دفعة مسددة فوراً للمورد)
                      </label>
                    </div>

                    {isPaidNow && totalCost > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.setValue("paidAmount", totalCost)}
                        className="text-xs border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-semibold"
                      >
                        سداد كامل المبلغ ({totalCost.toLocaleString()} ج.م)
                      </Button>
                    )}
                  </div>

                  {isPaidNow && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-emerald-200/60">
                      <FormField
                        control={form.control}
                        name="paidAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-gray-700">المبلغ المسدد الآن (ج.م) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="treasuryAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold text-gray-700">حساب الخزينة أو البنك المسدد منه *</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                value={field.value || ""}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <option value="" disabled>-- اختر الحساب المالي المسدد منه --</option>
                                {treasuryAccounts.map((acc) => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.name} (رصيد: {Number(acc.balance).toLocaleString()} {acc.currency})
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-gray-700">ملاحظات الصفقة</FormLabel>
                      <FormControl>
                        <Input placeholder="تفاصيل إضافية عن جودة البضاعة أو مواصفات التصدير (اختياري)..." value={field.value ?? ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button asChild type="button" variant="outline" className="gap-2">
                  <Link href="/finished-purchases">
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
                      <Loader2 className="h-4 w-4 animate-spin" /> جاري تسجيل الصفقة...
                    </>
                  ) : (
                    "تسجيل صفقة الجاهز"
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
