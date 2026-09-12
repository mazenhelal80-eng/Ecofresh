"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ShoppingBag, Loader2, ArrowRight, Calculator, Building2, Tag, Calendar } from "lucide-react";
import Link from "next/link";

import { PackagingPurchaseSchema, type PackagingPurchaseFormValues } from "@/lib/validations/purchases";
import { addPackagingPurchase, getStationsForPackagingSelect } from "@/actions/packaging-purchases";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

interface SupplyOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  unitPrice: any;
}

interface SupplierOption {
  id: string;
  code: string;
  name: string;
}

interface StationOption {
  id: string;
  name: string;
  location?: string | null;
}

interface PackagingPurchaseFormProps {
  supplies: SupplyOption[];
  suppliers: SupplierOption[];
  stations?: StationOption[];
  defaultStationId?: string;
}

export function PackagingPurchaseForm({
  supplies,
  suppliers,
  stations: initialStations = [],
  defaultStationId,
}: PackagingPurchaseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stations, setStations] = useState<StationOption[]>(initialStations);
  const [loadingStations, setLoadingStations] = useState(initialStations.length === 0);
  const [submissionId] = useState(() => `SUB-PKG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`);

  // Contextual station fetching if not passed via props
  useEffect(() => {
    if (initialStations.length > 0) {
      setStations(initialStations);
      setLoadingStations(false);
    } else {
      setLoadingStations(true);
      getStationsForPackagingSelect()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setStations(data);
          }
        })
        .catch((err) => console.error("Failed to load stations:", err))
        .finally(() => setLoadingStations(false));
    }
  }, [initialStations]);

  const defaultSupply = supplies[0];
  const initialStation = defaultStationId || initialStations[0]?.id || "";

  const form = useForm<PackagingPurchaseFormValues>({
    resolver: zodResolver(PackagingPurchaseSchema),
    defaultValues: {
      stationId: initialStation,
      supplyId: defaultSupply?.id || "",
      supplierId: suppliers[0]?.id || "",
      qty: 0,
      unitPrice: Number(defaultSupply?.unitPrice || 0),
      invoiceNo: "",
      date: new Date().toISOString().substring(0, 10),
      submissionId,
    },
  });

  // Keep stationId synced once stations load if not already set
  useEffect(() => {
    const currentVal = form.getValues("stationId");
    if (!currentVal && stations.length > 0) {
      form.setValue("stationId", defaultStationId || stations[0].id, { shouldValidate: true });
    }
  }, [stations, defaultStationId, form]);

  const selectedSupplyId = form.watch("supplyId");
  const currentSupply = supplies.find((s) => s.id === selectedSupplyId) || defaultSupply;
  const catalogPrice = Number(currentSupply?.unitPrice || 0);

  const qty = Number(form.watch("qty")) || 0;
  const unitPrice = Number(form.watch("unitPrice")) || 0;
  const totalCost = qty * unitPrice;
  const isCustomPrice = Math.abs(unitPrice - catalogPrice) > 0.001;

  async function onSubmit(values: PackagingPurchaseFormValues) {
    setIsSubmitting(true);
    try {
      const res = await addPackagingPurchase(values);
      if (res.success) {
        toast.success(res.message);
        router.push("/packaging-purchases");
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
      toast.error("حدث خطأ غير متوقع أثناء حفظ فاتورة المشتريات");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Live Total Cost Banner */}
      <Card className="bg-gradient-to-r from-[#012d1d] to-emerald-900 text-white shadow-md border-none">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-200 block font-semibold">إجمالي قيمة الفاتورة (EGP)</span>
            <span className="text-3xl font-bold text-amber-300 mt-1 block">
              {totalCost.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              ج.م
            </span>
            <span className="text-xs text-emerald-300 mt-1 block">
              شراء {qty.toLocaleString()} {currentSupply?.unit || "وحدة"} بسعر {unitPrice.toFixed(2)} ج.م/وحدة
            </span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
            <Calculator className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#012d1d] text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">فاتورة شراء مستلزمات وتعبئة</CardTitle>
              <CardDescription className="text-xs text-gray-500">
                إضافة رصيد جديد للمستلزم في المخزن وتوليد قيد استحقاق للمورد
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Station Selection (Contextual & Strict) */}
                <FormField
                  control={form.control}
                  name="stationId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel className="font-semibold text-gray-700 flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-emerald-800" />
                          المحطة المستلمة للمستلزمات *
                        </FormLabel>
                        {defaultStationId && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px]">
                            محددة سياقياً للمحطة الحالية
                          </Badge>
                        )}
                      </div>
                      <FormControl>
                        {loadingStations ? (
                          <div className="text-xs text-gray-400 py-2">جاري تحميل المحطات المعتمدة...</div>
                        ) : (
                          <select
                            {...field}
                            value={field.value || ""}
                            disabled={Boolean(defaultStationId && stations.some((s) => s.id === defaultStationId))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-600"
                          >
                            <option value="">-- اختر المحطة المستلمة للمخزن --</option>
                            {stations.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} ({st.id}) {st.location ? `— ${st.location}` : ""}
                              </option>
                            ))}
                          </select>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Supply Select */}
                <FormField
                  control={form.control}
                  name="supplyId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-gray-700">مستلزم التعبئة المطلوب *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            const sup = supplies.find((s) => s.id === e.target.value);
                            if (sup) {
                              form.setValue("unitPrice", Number(sup.unitPrice));
                            }
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {supplies.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code}) — السعر المعتمد: {Number(s.unitPrice).toFixed(2)} ج.م
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Supplier Select */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold text-gray-700">مورد المستلزمات *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {suppliers.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.name} ({sup.code})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">
                        الكمية المشتراة ({currentSupply?.unit || "وحدة"}) *
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="any" min="0.001" placeholder="1000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unit Price with Catalog Price Benchmark */}
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="font-semibold text-gray-700">سعر شراء الوحدة (ج.م) *</FormLabel>
                        {isCustomPrice && (
                          <button
                            type="button"
                            onClick={() => form.setValue("unitPrice", catalogPrice)}
                            className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Tag className="h-3 w-3" /> استعادة الكتالوج ({catalogPrice.toFixed(2)})
                          </button>
                        )}
                      </div>
                      <FormControl>
                        <Input type="number" step="any" min="0.01" placeholder="18.00" {...field} />
                      </FormControl>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                        <span>سعر الكتالوج المعتمد: {catalogPrice.toFixed(2)} ج.م</span>
                        {isCustomPrice && (
                          <span className="text-amber-700 font-medium">سعر فاتورة مخصص</span>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                        تاريخ فاتورة الشراء
                      </FormLabel>
                      <FormControl>
                        <Input type="date" value={field.value ?? ""} onChange={field.onChange} />
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
                      <FormLabel className="font-semibold text-gray-700">رقم فاتورة الشراء (اختياري)</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: INV-2026-001 أو رقم إيصال المورد" value={field.value ?? ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button asChild type="button" variant="outline" className="gap-2">
  <Link href="/packaging-purchases">
                    <ArrowRight className="h-4 w-4" /> إلغاء
                  </Link>
</Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#012d1d] hover:bg-[#02472e] text-white gap-2 min-w-[150px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> جاري قيد الشراء...
                    </>
                  ) : (
                    "قيد الشراء وزيادة المخزون"
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
