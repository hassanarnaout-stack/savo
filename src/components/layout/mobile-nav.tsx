"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  icon: string | null;
}

export function MobileNav({ categories, locale }: { categories: Category[]; locale: string }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/5"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex w-72 flex-col gap-0.5 bg-saveo-ink-mid p-5 font-manrope animate-fade-up">
            <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-4">
              <Image src="/brand/savo-logo-light.png" alt="Savo" width={78} height={27} className="h-6 w-auto" />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-saveo-muted transition-colors hover:text-white"
              >
                {cat.icon} {locale === "ar" && cat.nameAr ? cat.nameAr : cat.name}
              </Link>
            ))}
            <Link
              href="/products"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg px-3 py-2.5 text-sm font-bold text-saveo-primary"
            >
              {t("shopAll")} {locale === "ar" ? "←" : "→"}
            </Link>
            <div className="mt-auto flex flex-col gap-1 border-t border-white/[0.08] pt-3">
              <Link href="/favorites" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-saveo-muted transition-colors hover:text-white">
                {t("favorites")}
              </Link>
              <Link href="/account" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-saveo-muted transition-colors hover:text-white">
                {t("account")}
              </Link>
            </div>
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
