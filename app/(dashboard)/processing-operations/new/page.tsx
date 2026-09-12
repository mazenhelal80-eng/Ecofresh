import React from "react";
import { getProcessingWizardData } from "@/actions/processing";
import { ProcessingWizard } from "@/components/modules/processing/wizard/processing-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "معالج إضافة عملية تشغيل جديدة | EcoFresh",
};

export default async function NewProcessingOperationPage() {
  const wizardData = await getProcessingWizardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">معالج تشغيل التدوير والفرز (Processing Wizard)</h1>
        <p className="text-sm text-gray-500 mt-1">
          خطوات تفاعلية لإدراج عملية التدوير والفرز، سحب اللوطات والمستلزمات، وحساب تكلفة الإنتاج والتصافي لحظياً.
        </p>
      </div>

      <ProcessingWizard
        stations={wizardData.stations}
        contractors={wizardData.contractors}
        products={wizardData.products}
        rawBatches={wizardData.rawBatches}
        supplies={wizardData.supplies}
      />
    </div>
  );
}
