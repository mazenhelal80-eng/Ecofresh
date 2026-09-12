import React from "react";
import Link from "next/link";
import { PlusCircle, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFinancialTransactions, getVoucherFormData } from "@/actions/financials";
import { TransactionsTable } from "@/components/modules/financials/transactions-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "سندات القبض والصرف | EcoFresh",
};

export default async function TransactionsPage() {
  const [transactions, formData] = await Promise.all([
    getFinancialTransactions(),
    getVoucherFormData(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#012d1d] flex items-center gap-2">
              <Wallet className="h-6 w-6 text-[#012d1d]" />
              سندات الدفع والتحصيل (Financial Vouchers)
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-0.5 rounded-full font-bold">
              إدارة حركة الخزينة والبنوك
            </span>
          </div>
          <p className="text-xs text-gray-500">
            قيد تحصيلات العملاء، سداد المزارعين والموردين والمقاولين، وتتبع أثر السيولة النقدية مع الحماية ضد السحب المكشوف.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild className="bg-[#012d1d] hover:bg-[#02472e] text-white font-bold text-xs gap-2 shadow-sm">
  <Link href="/financials/transactions/new">
              <PlusCircle className="h-4 w-4" />
              + إصدار سند جديد (قبض / صرف)
            </Link>
</Button>
        </div>
      </div>

      {/* Main Transactions Table & Ledger */}
      <TransactionsTable
        transactions={transactions}
        accounts={formData.treasuryAccounts}
      />
    </div>
  );
}
