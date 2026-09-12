export const dynamic = "force-dynamic";
import { StationForm } from "@/components/modules/stations/station-form";

export const metadata = {
  title: "إضافة محطة جديدة | EcoFresh",
};

export default function NewStationPage() {
  return (
    <div className="space-y-6">
      <StationForm />
    </div>
  );
}
