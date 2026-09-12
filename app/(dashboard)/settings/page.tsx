export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import { getUsersList } from "@/actions/users";
import { SettingsHub } from "@/components/modules/settings/settings-hub";

export const metadata = {
  title: "إعدادات النظام والمستخدمين | EcoFresh",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const canManageUsers = can(user.role, "users.view");
  let usersList: any[] = [];

  if (canManageUsers) {
    const res = await getUsersList();
    if (res.success && res.users) {
      usersList = res.users;
    }
  }

  return (
    <SettingsHub
      currentUser={user}
      usersList={usersList}
      canManageUsers={canManageUsers}
    />
  );
}
