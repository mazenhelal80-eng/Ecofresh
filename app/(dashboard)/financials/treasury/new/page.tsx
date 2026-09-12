export const dynamic = "force-dynamic";
import { getStations } from "@/actions/stations";
import { TreasuryForm } from "@/components/modules/financials/treasury-form";

export const metadata = {
  title: "إضافة حساب بنكي / خزينة جديد | EcoFresh",
};

export default async function NewTreasuryAccountPage() {
  const stations = await getStations();

  return (
    <div className="py-4">
      <TreasuryForm stations={stations.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
