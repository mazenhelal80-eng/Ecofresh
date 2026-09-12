"use client";

import { Search, LogOut, User, Building, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { MobileNav } from "./mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  user?: {
    fullName: string;
    role: string;
    title?: string | null;
    stationId?: string | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const userName = user?.fullName || "المشرف العام";
  const userRole = user?.role || "ADMIN";
  const userTitle = user?.title || "مدير النظام";

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[#c1c8c2] bg-white px-4 shadow-sm md:px-5">
      {/* Right side: Mobile Menu Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <MobileNav userRole={user?.role} />
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Left side: Search & User Dropdown */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Global Search Input */}
        <div className="relative hidden md:block w-72">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="بحث سريع برقم الشحنة أو العميل..."
            className="pr-9 pl-3 h-9 text-xs font-medium bg-gray-50 border-[#c1c8c2] focus:bg-white focus:border-[#012d1d]"
          />
        </div>

        {/* User Profile Dropdown Menu */}
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-full p-0.5 transition-colors hover:bg-gray-100 focus:outline-none">
              <Avatar className="h-8 w-8 bg-[#012d1d] text-white font-bold border-2 border-emerald-600 shadow-sm">
                <AvatarFallback className="bg-[#012d1d] text-white text-xs">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-right md:flex md:flex-col">
                <span className="text-xs font-bold text-gray-900 leading-tight">
                  {userName}
                </span>
                <span className="text-[11px] text-emerald-800 font-bold">
                  {userTitle} ({userRole})
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-[#012d1d]">{userName}</p>
                <p className="text-xs text-gray-500">{userTitle}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer gap-2 text-xs">
              <a href="/settings">
                <User className="h-4 w-4 text-gray-500" />
                <span>الملف الشخصي والإعدادات</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2 text-xs">
              <ShieldCheck className="h-4 w-4 text-gray-500" />
              <span>الصلاحيات: {userRole}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-xs text-red-600 focus:text-red-600"
              onClick={async () => {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
