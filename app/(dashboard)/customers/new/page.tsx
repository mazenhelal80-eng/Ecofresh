export const dynamic = "force-dynamic";
import { CustomerForm } from "@/components/modules/customers/customer-form";

export const metadata = {
  title: "إضافة عميل جديد | EcoFresh",
};

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <CustomerForm />
    </div>
  );
}
