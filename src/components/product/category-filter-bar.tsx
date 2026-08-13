"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";

interface Category {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
}

export function CategoryFilterBar({
  categories,
  activeCategory,
  activeSort,
}: {
  categories: Category[];
  activeCategory?: string;
  activeSort?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const common = useTranslations("common");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateParam("category", "")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            !activeCategory ? "bg-saveo-emerald-700 text-white" : "bg-saveo-emerald-700/5 text-saveo-emerald-700/70"
          }`}
        >
          {common("all")}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateParam("category", cat.slug)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              activeCategory === cat.slug
                ? "bg-saveo-emerald-700 text-white"
                : "bg-saveo-emerald-700/5 text-saveo-emerald-700/70"
            }`}
          >
            {locale === "ar" && cat.nameAr ? cat.nameAr : cat.name}
          </button>
        ))}
      </div>
      <select
        value={activeSort ?? ""}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium"
      >
        <option value="">{common("newest")}</option>
        <option value="price_asc">{common("priceLowHigh")}</option>
        <option value="price_desc">{common("priceHighLow")}</option>
        <option value="discount">{common("biggestDiscount")}</option>
      </select>
    </div>
  );
}
