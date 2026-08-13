"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SidebarLogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-medium text-red-600 hover:bg-red-50"
    >
      <LogOut className="h-4 w-4" /> Logout
    </button>
  );
}
