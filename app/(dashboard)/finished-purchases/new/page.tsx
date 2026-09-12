import {
  getFinishedGoodsSuppliersSelect,
  getStationsForSelect,
  getProductsForDirectDealSelect,
  getPackagingSuppliesSelect,
} from "@/actions/direct-deals";
import { getTreasuryAccounts } from "@/actions/treasury";
import { DirectDealForm } from "@/components/modules/procurement/direct-deal-form";

export const dynamic = "force-dynamic";

export default async function NewFinishedPurchasePage() {
  const [suppliers, stations, products, packagingSupplies, treasuryAccounts] = await Promise.all([
    getFinishedGoodsSuppliersSelect(),
    getStationsForSelect(),
    getProductsForDirectDealSelect(),
    getPackagingSuppliesSelect(),
    getTreasuryAccounts(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">تسجيل صفقة شراء محصول جاهز مباشرة</h1>
        <p className="text-sm text-gray-500 mt-1">
          تسجيل المشتريات من الموردين وتوليد الدفعات ومستحقات الموردين وتوجيه البضاعة للمحطة
        </p>
      </div>

      <DirectDealForm
        suppliers={suppliers}
        stations={stations}
        products={products}
        packagingSupplies={packagingSupplies}
        treasuryAccounts={treasuryAccounts}
      />
    </div>
  );
}
