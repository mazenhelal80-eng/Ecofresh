export const dynamic = "force-dynamic";

import React from "react";
import { getEmployees } from "@/actions/employees";
import { getStationsForSelect } from "@/actions/contractors";
import { getTreasuryAccounts } from "@/actions/treasury";
import { EmployeeList } from "@/components/modules/employees/EmployeeList";

export const metadata = {
  title: "إدارة الموظفين والرواتب | EcoFresh",
};

export default async function EmployeesPage() {
  const [employees, stations, accounts] = await Promise.all([
    getEmployees(),
    getStationsForSelect(),
    getTreasuryAccounts(),
  ]);

  return (
    <EmployeeList
      employees={employees}
      stations={stations}
      treasuryAccounts={accounts.map((a) => ({
        id: a.id,
        name: a.name,
        balance: Number(a.balance),
        currency: a.currency,
      }))}
    />
  );
}
