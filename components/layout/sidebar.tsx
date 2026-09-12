"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Snowflake } from "lucide-react";
import { navGroups } from "@/config/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { UserRole } from "@prisma/client";

interface SidebarProps {
  userRole?: UserRole | string | null;
  onItemClick?: () => void;
  className?: string;
}

export function Sidebar({ userRole = UserRole.OWNER, onItemClick, className }: SidebarProps) {
  const pathname = usePathname();

  // Filter groups and items dynamically based on the current user's role/permissions
  const visibleGroups = navGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (!item.permission) return true;
        return can(userRole, item.permission);
      });
      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "flex h-full w-[260px] flex-col border-l border-[#c1c8c2] bg-[#012d1d] text-white shadow-lg shrink-0",
        className
      )}
    >
      {/* Brand Logo Header */}
      <div className="flex h-14 items-center border-b border-emerald-900/60 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 font-bold text-white"
          onClick={onItemClick}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white border border-emerald-500/30">
            <Snowflake className="h-5 w-5 text-[#0054cd]" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold leading-tight tracking-wide text-white">EcoFresh</span>
            <span className="text-[11px] text-emerald-200/80 font-normal">إيكو فريش — إدارة التصدير</span>
          </div>
        </Link>
      </div>

      {/* Scrollable Navigation Items */}
      <ScrollArea className="flex-1 px-2.5 py-3">
        <div className="space-y-4">
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.title} className="space-y-1">
              <h3 className="px-2.5 text-[11px] font-bold text-emerald-300/80 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-0.5 pt-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onItemClick}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold transition-all duration-150",
                        isActive
                          ? "bg-white/15 text-white border-r-4 border-[#0054cd] shadow-sm font-bold"
                          : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-[#0054cd]" : "text-emerald-300/80"
                        )}
                      />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.badge && (
                        <span className="rounded-full bg-[#0054cd] px-2 py-0.5 text-xs font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
              {groupIndex < visibleGroups.length - 1 && (
                <Separator className="my-2 bg-emerald-900/50" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
