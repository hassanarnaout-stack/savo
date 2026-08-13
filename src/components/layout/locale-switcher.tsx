"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { Languages } from "lucide-react";
import { useTransition } from "react";

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  const nextLocale = currentLocale === "ar" ? "en" : "ar";
  const label = currentLocale === "ar" ? "English" : "العربية";

  function handleSwitch() {
    startTransition(() => {
      // @ts-expect-error dynamic params spread is fine at runtime
      router.replace({ pathname, params }, { locale: nextLocale });
    });
  }

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-saveo-emerald-700 hover:bg-saveo-emerald-700/5 disabled:opacity-50"
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
