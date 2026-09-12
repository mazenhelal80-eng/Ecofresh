export const dynamic = "force-dynamic";
import React from "react";
import { notFound } from "next/navigation";
import { getShipmentTraceabilityTree } from "@/lib/data/shipment-dna";
import { ShipmentHeaderCard } from "@/components/modules/shipments/shipment-header-card";
import { TraceabilityTree } from "@/components/modules/shipments/traceability-tree";
import { CostBreakdownCard } from "@/components/modules/shipments/cost-breakdown-card";
import { ProfitSummaryCard } from "@/components/modules/shipments/profit-summary-card";

export const metadata = {
  title: "تفاصيل الشحنة وشجرة التتبع العكسية | EcoFresh",
};

interface ShipmentDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function ShipmentDetailsPage({ params }: ShipmentDetailsPageProps) {
  const shipment = await getShipmentTraceabilityTree(params.id);

  if (!shipment) {
    notFound();
  }

  return (
    <div className="space-y-6 dir-rtl">
      {/* 1. Header Card with Container & Seal Info */}
      <ShipmentHeaderCard shipment={shipment} />

      {/* 2. Profit & Financial Summary Card */}
      <ProfitSummaryCard shipment={shipment} />

      {/* 3. Main Grid: Reverse Traceability Tree & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              شجرة التتبع الجمركي العكسية من الحاوية للمزرعة (Farm-to-Container)
            </h3>
            <TraceabilityTree shipment={shipment} />
          </div>
        </div>

        <div className="space-y-6">
          <CostBreakdownCard shipment={shipment} />
        </div>
      </div>
    </div>
  );
}
