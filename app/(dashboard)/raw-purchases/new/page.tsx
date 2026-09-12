export const dynamic = "force-dynamic";
import { getStationsForRawSelect, getSuppliersForRawSelect } from "@/actions/raw-batches";
import { RawArrivalForm } from "@/components/modules/procurement/raw-arrival-form";

export const metadata = {
  title: "ميزان البسكول ووارد الخام | EcoFresh",
};

export default async function NewRawArrivalPage() {
  const stations = await getStationsForRawSelect();
  const suppliers = await getSuppliersForRawSelect();

  return (
    <div className="space-y-6">
      <RawArrivalForm stations={stations} suppliers={suppliers} />
    </div>
  );
}
