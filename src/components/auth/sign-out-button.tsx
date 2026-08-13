"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="card flex w-full items-center gap-4 p-5 text-start"
    >
      <LogOut className="h-8 w-8 text-red-500" />
      <span className="font-semibold text-red-600">{label}</span>
    </button>
  );
}
