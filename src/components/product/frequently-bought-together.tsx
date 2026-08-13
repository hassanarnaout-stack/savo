"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatKWD } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";
import type { ProductCardData } from "@/components/product/product-card";

export function FrequentlyBoughtTogether({ items }: { items: ProductCardData[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));
  const addItem = useCartStore((s) => s.addItem);
  const locale = useLocale();
  const p = useTranslations("product");

  const total = items
    .filter((i) => selected.has(i.id))
    .reduce((sum, i) => sum + Number(i.saveoPrice), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addBundle() {
    items
      .filter((i) => selected.has(i.id))
      .forEach((i) => {
        const image = i.images[0]?.url ?? "/placeholder-product.png";
        addItem(
          {
            productId: i.id,
            name: i.name,
            slug: i.slug,
            image,
            originalPrice: Number(i.originalPrice),
            saveoPrice: Number(i.saveoPrice),
            stockQty: i.stockQty,
          },
          1
        );
      });
    toast.success(p("addBundle"));
  }

  return (
    <section className="border-t border-black/5 py-8">
      <h2 className="mb-4 text-lg font-bold">{p("fbtTitle")}</h2>
      <div className="flex flex-wrap items-center gap-3">
        {items.map((item, idx) => {
          const displayName = locale === "ar" && item.nameAr ? item.nameAr : item.name;
          return (
            <div key={item.id} className="flex items-center gap-3">
              <label className="flex w-32 cursor-pointer flex-col items-center gap-2 rounded-xl2 border border-black/10 p-3 text-center">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="self-start accent-saveo-emerald-700"
                />
                <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-saveo-emerald-700/5">
                  <Image src={item.images[0]?.url ?? "/placeholder-product.png"} alt={displayName} fill className="object-cover" />
                </div>
                <p className="line-clamp-2 text-[11px] font-medium">{displayName}</p>
                <p className="text-xs font-bold text-saveo-emerald-600">{formatKWD(Number(item.saveoPrice))}</p>
              </label>
              {idx < items.length - 1 && <Plus className="h-4 w-4 rtl:-scale-x-100 text-saveo-emerald-700/30" />}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <p className="text-sm">
          {selected.size} × {formatKWD(total)}
        </p>
        <button onClick={addBundle} className="btn-dark">
          {p("addBundle")}
        </button>
      </div>
    </section>
  );
}
