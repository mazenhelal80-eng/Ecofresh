import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fa] print:h-auto print:overflow-visible print:bg-white print:block" dir="rtl">
      {/* Desktop Sidebar (Fixed 260px on lg screens) */}
      <div className="hidden lg:block lg:shrink-0 print:hidden">
        <Sidebar userRole={user?.role} />
      </div>

      {/* Main Content Area with Header */}
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible print:h-auto print:block">
        <div className="print:hidden">
          <Header user={user} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0 print:m-0 print:overflow-visible print:h-auto print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
