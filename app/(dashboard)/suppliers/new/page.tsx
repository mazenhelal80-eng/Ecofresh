export const dynamic = "force-dynamic";
import { SupplierForm } from "@/components/modules/suppliers/supplier-form";

export const metadata = {
  title: "إضافة مورد جديد | EcoFresh",
};

export default function NewSupplierPage() {
  return (
    <div className="space-y-6">
      <SupplierForm />
    </div>
  );
}
