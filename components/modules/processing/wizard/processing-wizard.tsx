"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Station, Contractor, Product, RawBatch, Supply, Supplier } from "@prisma/client";
import { ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardStepIndicator } from "./wizard-step-indicator";
import { Step1General } from "./step-1-general";
import { Step2RawIssues, RawBatchItem } from "./step-2-raw-issues";
import { Step3Supplies, SupplyIssueItem } from "./step-3-supplies";
import { Step4CostingPreview } from "./step-4-costing-preview";
import { ProcessingSchema, ProcessingFormValues } from "@/lib/validations/processing";
import { createProcessingOperation } from "@/actions/processing";
import { toast } from "sonner";

type ExtendedRawBatch = RawBatch & {
  supplier?: Supplier;
};

interface ProcessingWizardProps {
  stations: any[];
  contractors: Contractor[];
  products: Product[];
  rawBatches: ExtendedRawBatch[];
  supplies: any[];
}

export function ProcessingWizard({
  stations,
  contractors,
  products,
  rawBatches,
  supplies,
}: ProcessingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const initialStationId = stations.length > 0 ? stations[0].id : "";
  const initialContractor = contractors.length > 0 ? contractors[0] : null;

  // Form State preserved across steps
  const [formData, setFormData] = useState<ProcessingFormValues>({
    stationId: initialStationId,
    contractorId: initialContractor ? initialContractor.id : "",
    rawProduct: "",
    finishedProduct: products.length > 0 ? products[0].name : "",
    date: new Date().toISOString().substring(0, 10),
    targetRawKg: 0,
    rawIssues: [],
    suppliesIssues: [],
    finishedOutputKg: 0,
    secondaryOutputKg: 0,
    otherCost: 0,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [stepError, setStepError] = useState<string | null>(null);

  const selectedStation = stations.find((s) => s.id === formData.stationId);
  const selectedContractor = contractors.find((c) => c.id === formData.contractorId);

  // Verification checks for stock over-withdrawal and exact match before moving forward
  const validateCurrentStep = (step: number): boolean => {
    setStepError(null);
    setErrors({});

    if (step === 1) {
      if (!formData.stationId) {
        setStepError("يرجى اختيار محطة التشغيل");
        setErrors({ stationId: ["المحطة مطلوبة"] });
        return false;
      }
      if (!formData.contractorId) {
        setStepError("يرجى اختيار المقاول");
        setErrors({ contractorId: ["المقاول مطلوب"] });
        return false;
      }
      if (!formData.rawProduct.trim()) {
        setStepError("يرجى إدخال اسم المحصول الخام");
        setErrors({ rawProduct: ["المحصول الخام مطلوب"] });
        return false;
      }
      if (!formData.finishedProduct.trim()) {
        setStepError("يرجى اختيار المنتج النهائي");
        setErrors({ finishedProduct: ["المنتج النهائي مطلوب"] });
        return false;
      }
      return true;
    }

    if (step === 2) {
      const target = Number(formData.targetRawKg || 0);
      if (target <= 0) {
        setStepError("الكمية المستهدفة للسحب يجب أن تكون أكبر من الصفر");
        setErrors({ targetRawKg: ["الكمية المستهدفة مطلوبة ويجب أن تكون أكبر من الصفر"] });
        return false;
      }

      if (formData.rawIssues.length === 0) {
        setStepError("يجب سحب لوط خام واحد على الأقل للمتابعة");
        setErrors({ rawIssues: ["يجب سحب لوط خام واحد على الأقل"] });
        return false;
      }

      let totalWithdrawn = 0;
      for (const issue of formData.rawIssues) {
        if (!issue.batchId) {
          setStepError("جميع اللوطات المحددة يجب أن تكون معتمدة");
          return false;
        }
        if (issue.qty <= 0) {
          setStepError("كمية الخام المسحوبة يجب أن تكون أكبر من الصفر لكل لوط");
          return false;
        }

        const batch = rawBatches.find((b) => b.batchId === issue.batchId);
        if (batch && batch.stationId !== formData.stationId) {
          setStepError(`اللوط (${issue.batchId}) لا يتبع المحطة المحددة`);
          return false;
        }
        if (
          batch &&
          formData.rawProduct &&
          batch.rawProduct.trim().toLowerCase() !== formData.rawProduct.trim().toLowerCase()
        ) {
          setStepError(
            `اللوط (${issue.batchId}) يتبع محصول (${batch.rawProduct}) ولا يطابق المحصول المطلوب تشغيله (${formData.rawProduct})`
          );
          return false;
        }
        const available = batch ? Number(batch.availableQty) : 0;
        if (issue.qty > available) {
          setStepError(
            `الكمية المسحوبة باللوط (${issue.batchId}) تتجاوز الرصيد المتاح (${available.toLocaleString()} كجم)`
          );
          return false;
        }
        totalWithdrawn += Number(issue.qty || 0);
      }

      totalWithdrawn = Math.round(totalWithdrawn * 100) / 100;
      if (Math.abs(totalWithdrawn - target) > 0.001) {
        setStepError(
          `عدم تطابق في سحب الخامات: إجمالي المسحوب الفعلي (${totalWithdrawn.toLocaleString()} كجم) لا يساوي الكمية المستهدفة (${target.toLocaleString()} كجم). يجب المطابقة التامة للمتابعة.`
        );
        return false;
      }

      return true;
    }

    if (step === 3) {
      // Validate supplies if any were selected
      for (const issue of formData.suppliesIssues) {
        if (!issue.supplyId) {
          setStepError("جميع المستلزمات المحددة يجب أن تكون صحيحة");
          return false;
        }
        const supply: any = supplies.find((s) => s.id === issue.supplyId);
        const ss = supply?.stationSupplies?.find(
          (item: any) =>
            item.location?.stationId === formData.stationId &&
            item.location?.type === "SUPPLIES"
        );
        // Strict Station Isolation: No fallback to global supply.stock
        const stock = ss ? Number(ss.stock) : 0;

        const requested = Number(issue.requested || 0);
        const consumed = Number(issue.consumed || 0);
        const waste = Number(issue.waste || 0);
        const totalWithdrawn = Math.round((consumed + waste) * 100) / 100;

        if (requested <= 0 && totalWithdrawn <= 0) {
          continue;
        }

        if (Math.abs(totalWithdrawn - requested) > 0.001) {
          setStepError(
            `عدم تطابق في مستلزم التعبئة (${supply?.name || issue.supplyId}): إجمالي المنصرف (${totalWithdrawn}) لا يساوي الكمية المطلوبة (${requested}).`
          );
          return false;
        }

        if (totalWithdrawn > stock) {
          setStepError(
            `الكمية المنصرفة الكلية للمستلزم (${supply?.name || issue.supplyId}) تتجاوز رصيد مخزن المحطة المتاح (${stock.toLocaleString()})`
          );
          return false;
        }
      }
      return true;
    }

    if (step === 4) {
      const totalRawInput = formData.rawIssues.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      if (
        formData.finishedOutputKg === undefined ||
        formData.finishedOutputKg === null ||
        formData.finishedOutputKg < 0
      ) {
        setStepError("الناتج التام لا يمكن أن يكون سالباً");
        setErrors({ finishedOutputKg: ["الناتج التام لا يمكن أن يكون سالباً"] });
        return false;
      }
      if (formData.finishedOutputKg > totalRawInput) {
        setStepError("الكمية الخارجة لا يمكن أن تكون أكبر من الكمية الداخلة");
        setErrors({ finishedOutputKg: ["الكمية الخارجة لا يمكن أن تكون أكبر من الكمية الداخلة"] });
        return false;
      }
      return true;
    }

    return true;
  };

  // Step 2 & Step 3 Reactive Guard Checks for Next Button
  const isStep2ExactMatch = (() => {
    const target = Number(formData.targetRawKg || 0);
    if (target <= 0 || formData.rawIssues.length === 0) return false;
    let sum = 0;
    const normCrop = formData.rawProduct?.trim().toLowerCase();
    for (const issue of formData.rawIssues) {
      const batch = rawBatches.find((b) => b.batchId === issue.batchId);
      if (!batch || batch.stationId !== formData.stationId) return false;
      if (normCrop && batch.rawProduct.trim().toLowerCase() !== normCrop) return false;
      const available = Number(batch.availableQty);
      if (issue.qty <= 0 || issue.qty > available) return false;
      sum += Number(issue.qty || 0);
    }
    return Math.abs(Math.round(sum * 100) / 100 - target) < 0.001;
  })();

  const isStep3ExactMatch = (() => {
    if (formData.suppliesIssues.length === 0) return true;
    for (const issue of formData.suppliesIssues) {
      const supply: any = supplies.find((s) => s.id === issue.supplyId);
      const ss = supply?.stationSupplies?.find(
        (item: any) =>
          item.location?.stationId === formData.stationId &&
          item.location?.type === "SUPPLIES"
      );
      // Strict Station Isolation: No fallback to global supply.stock
      const stock = ss ? Number(ss.stock) : 0;
      const requested = Number(issue.requested || 0);
      const withdrawn = Math.round((Number(issue.consumed || 0) + Number(issue.waste || 0)) * 100) / 100;
      if (requested <= 0 && withdrawn <= 0) continue;
      if (Math.abs(withdrawn - requested) > 0.001) return false;
      if (withdrawn > stock) return false;
    }
    return true;
  })();

  const canProceedToNextStep =
    currentStep === 1
      ? true
      : currentStep === 2
      ? isStep2ExactMatch
      : currentStep === 3
      ? isStep3ExactMatch
      : true;

  const handleNext = () => {
    if (validateCurrentStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handlePrev = () => {
    setStepError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep(4)) return;

    // Filter out empty supplies issues
    const cleanedSupplies = (formData.suppliesIssues || []).filter(
      (s) => Number(s.requested || 0) > 0 || Number(s.consumed || 0) > 0 || Number(s.waste || 0) > 0
    );

    const submissionData = {
      ...formData,
      suppliesIssues: cleanedSupplies,
    };

    // Validate complete Zod schema
    const validated = ProcessingSchema.safeParse(submissionData);
    if (!validated.success) {
      setErrors(validated.error.flatten().fieldErrors);
      setStepError("يرجى مراجعة وتصحيح البيانات المدخلة قبل الاعتماد");
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `PR-SUB-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const res = await createProcessingOperation({ ...submissionData, idempotencyKey });
      if (res.success) {
        toast.success(res.message || "تم اعتماد وإقفال التشغيلة بنجاح");
        router.push("/processing-operations");
      } else {
        setStepError(res.error || "حدث خطأ أثناء اعتماد العملية");
        if (res.errors) setErrors(res.errors);
      }
    } catch (err: any) {
      setStepError(err.message || "حدث خطأ أثناء اعتماد العملية");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <WizardStepIndicator
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step < currentStep) setCurrentStep(step);
        }}
      />

      {/* General Step Error Alert */}
      {stepError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{stepError}</span>
        </div>
      )}

      {/* Step Content */}
      <div>
        {currentStep === 1 && (
          <Step1General
            stations={stations}
            contractors={contractors}
            products={products}
            rawBatches={rawBatches}
            stationId={formData.stationId}
            contractorId={formData.contractorId}
            rawProduct={formData.rawProduct}
            finishedProduct={formData.finishedProduct}
            date={formData.date || ""}
            onChange={(fields) =>
              setFormData((prev) => {
                const isStationChanged = !!(fields.stationId && fields.stationId !== prev.stationId);
                const isCropChanged = !!(
                  fields.rawProduct &&
                  fields.rawProduct.trim().toLowerCase() !== prev.rawProduct.trim().toLowerCase()
                );

                let nextContractorId = fields.contractorId !== undefined ? fields.contractorId : prev.contractorId;

                return {
                  ...prev,
                  ...fields,
                  contractorId: nextContractorId,
                  // If station changes, reset contractor, raw intake, supplies, target and output to maintain strict station isolation
                  ...(isStationChanged
                    ? {
                        rawIssues: [],
                        targetRawKg: 0,
                        suppliesIssues: [],
                        finishedOutputKg: 0,
                        secondaryOutputKg: 0,
                      }
                    : isCropChanged
                    ? {
                        rawIssues: [],
                        targetRawKg: 0,
                        finishedOutputKg: 0,
                        secondaryOutputKg: 0,
                      }
                    : {}),
                };
              })
            }
            errors={errors}
          />
        )}

        {currentStep === 2 && (
          <Step2RawIssues
            stationId={formData.stationId}
            rawProduct={formData.rawProduct}
            stations={stations}
            rawBatches={rawBatches}
            targetRawKg={formData.targetRawKg}
            onTargetChange={(targetRawKg) =>
              setFormData((prev) => ({ ...prev, targetRawKg }))
            }
            rawIssues={formData.rawIssues}
            onChange={(rawIssues) => setFormData((prev) => ({ ...prev, rawIssues }))}
            errors={errors}
          />
        )}

        {currentStep === 3 && (
          <Step3Supplies
            stationId={formData.stationId}
            stations={stations}
            supplies={supplies}
            suppliesIssues={formData.suppliesIssues}
            onChange={(suppliesIssues) =>
              setFormData((prev) => ({ ...prev, suppliesIssues }))
            }
            errors={errors}
          />
        )}

        {currentStep === 4 && (
          <Step4CostingPreview
            station={selectedStation}
            contractor={selectedContractor}
            rawIssues={formData.rawIssues}
            rawBatches={rawBatches}
            suppliesIssues={formData.suppliesIssues}
            finishedOutputKg={formData.finishedOutputKg}
            secondaryOutputKg={formData.secondaryOutputKg || 0}
            otherCost={formData.otherCost || 0}
            notes={formData.notes || ""}
            onChange={(fields) => setFormData((prev) => ({ ...prev, ...fields }))}
            errors={errors}
          />
        )}
      </div>

      {/* Step Navigation Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              className="gap-2 font-semibold text-xs text-gray-700"
            >
              <ArrowRight className="h-4 w-4" /> الخطوة السابقة
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/processing-operations")}
            className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
          >
            إلغاء
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceedToNextStep}
              className={`${
                canProceedToNextStep
                  ? "bg-[#012d1d] hover:bg-[#02472e] text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              } gap-2 font-semibold text-xs shadow-sm transition-all`}
              title={
                !canProceedToNextStep
                  ? currentStep === 2
                    ? "يجب مطابقة الكمية المسحوبة مع الكمية المستهدفة تماماً للمتابعة"
                    : "يجب مطابقة الكميات المنصرفة مع المطلوبة وعدم تجاوز الأرصدة للمتابعة"
                  : "الانتقال للخطوة التالية"
              }
            >
              التالي <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2 font-semibold text-xs shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />{" "}
              {isSubmitting ? "جاري الحفظ والاعتماد..." : "اعتماد وإقفال العملية"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
