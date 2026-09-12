export const dynamic = "force-dynamic";
import { SupplyForm } from "@/components/modules/supplies/supply-form";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "إضافة مستلزم جديد | EcoFresh",
};

export default async function NewSupplyPage() {
  const stations = await prisma.station.findMany({
    where: { isActive: true },
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <SupplyForm stations={stations} />
    </div>
  );
}
