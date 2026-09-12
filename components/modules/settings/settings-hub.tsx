"use client";

import { useState } from "react";
import { AuthUser } from "@/lib/auth";
import { UserViewItem } from "@/actions/users";
import { Users, Shield, User, Settings as SettingsIcon, Snowflake, CheckCircle2, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersManagementTab } from "./users-management-tab";
import { RolesMatrixTab } from "./roles-matrix-tab";
import { MyAccountTab } from "./my-account-tab";
import { Badge } from "@/components/ui/badge";

interface SettingsHubProps {
  currentUser: AuthUser;
  usersList: UserViewItem[];
  canManageUsers: boolean;
}

export function SettingsHub({ currentUser, usersList, canManageUsers }: SettingsHubProps) {
  const [activeTab, setActiveTab] = useState<string>(canManageUsers ? "users" : "account");

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="h-6 w-6 text-[#012d1d]" />
            إعدادات النظام وإدارة الحسابات
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            إدارة الحساب الشخصي، الصلاحيات والأدوار، مستخدمي النظام، ومصفوفة الأمان.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-600 bg-emerald-100/70 text-emerald-900 text-xs font-bold px-3.5 py-1 gap-1.5 shadow-xs">
            <Shield className="h-4 w-4 text-emerald-800" />
            نظام RBAC مفعل ومحمي
          </Badge>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-100 p-1 rounded-xl h-11 border border-gray-200 w-full sm:w-auto flex justify-start">
          <TabsTrigger
            value="account"
            className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#012d1d] data-[state=active]:shadow-xs rounded-lg px-4 h-9"
          >
            <User className="h-4 w-4" />
            حسابي وكلمة المرور
          </TabsTrigger>

          {canManageUsers && (
            <TabsTrigger
              value="users"
              className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#012d1d] data-[state=active]:shadow-xs rounded-lg px-4 h-9"
            >
              <Users className="h-4 w-4" />
              إدارة المستخدمين ({usersList.length})
            </TabsTrigger>
          )}

          <TabsTrigger
            value="roles"
            className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#012d1d] data-[state=active]:shadow-xs rounded-lg px-4 h-9"
          >
            <Shield className="h-4 w-4" />
            الأدوار والصلاحيات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="outline-none">
          <MyAccountTab user={currentUser} />
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="users" className="outline-none">
            <UsersManagementTab initialUsers={usersList} currentUserRole={currentUser.role} />
          </TabsContent>
        )}

        <TabsContent value="roles" className="outline-none">
          <RolesMatrixTab />
        </TabsContent>
      </Tabs>

      {/* Developer & Product Branding Banner */}
      <div className="rounded-xl border-2 border-emerald-700/30 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-5 text-gray-900 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#012d1d] text-white shadow-md border border-emerald-600 shrink-0">
              <Snowflake className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wide text-emerald-950">EcoFresh ERP</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/80 text-emerald-900 border border-emerald-400 px-2.5 py-0.5 text-[11px] font-bold">
                  <Sparkles className="h-3 w-3 text-emerald-800" />
                  النظام المعتمد
                </span>
              </div>
              <p className="text-xs text-gray-800 font-medium mt-1">
                Developed & Maintained by <span className="font-bold text-emerald-950 underline decoration-emerald-600 decoration-2">Mazen Helal&Omar said</span>
              </p>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                Software & AI Developer
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm font-bold text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              <span>المنظومة مؤمّنة ونشطة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
