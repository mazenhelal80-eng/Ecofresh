"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { UserRole } from "@prisma/client";

interface MobileNavProps {
  userRole?: UserRole | string | null;
}

export function MobileNav({ userRole }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-gray-700 hover:text-[#012d1d]"
          aria-label="افتح القائمة"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-[260px]">
        <Sidebar userRole={userRole} onItemClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
