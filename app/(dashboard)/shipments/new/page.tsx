import React from "react";
import { getShipmentWizardData } from "@/actions/shipments";
import { ShipmentWizard } from "@/components/modules/shipments/wizard/shipment-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "معالج إنشاء شحنة تصدير | EcoFresh",
};

export default async function NewShipmentPage() {
  const wizardData = await getShipmentWizardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          معالج تجهيز واعتماد شحنة تصدير (Shipment 3-Step Wizard)
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          استدعاء بيانات طلبية العميل، سحب اللوطات التامة من مخزن الجاهز مع تتبع شجرة الموردين، وإدخال بيانات الحاوية والمصروفات اللوجستية.
        </p>
      </div>

      <ShipmentWizard
        clientOrders={wizardData.clientOrders}
        finishedGoodsBatches={wizardData.finishedGoodsBatches}
      />
    </div>
  );
}
