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
        const image = i.images[0]?.url ?? "/placeholder-product.svg";
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
    <section className="savo-pdp-fbt">
      <div className="savo-pdp-fbt-shell">
        <header className="savo-pdp-fbt-head"><p>BETTER TOGETHER</p><h2>{p("fbtTitle")}</h2></header>
        <div className="savo-pdp-fbt-panel">
          <div className="savo-pdp-fbt-products">
            {items.map((item, idx) => {
              const displayName = locale === "ar" && item.nameAr ? item.nameAr : item.name;
              return (
                <div key={item.id} className="savo-pdp-fbt-item">
                  <label>
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                    <div className="savo-pdp-fbt-image"><Image src={item.images[0]?.url ?? "/placeholder-product.svg"} alt={displayName} fill sizes="(max-width: 560px) 145px, 92px" /></div>
                    <span><strong>{displayName}</strong><b>{formatKWD(Number(item.saveoPrice))}</b></span>
                  </label>
                  {idx < items.length - 1 && <Plus className="savo-pdp-fbt-plus" />}
                </div>
              );
            })}
          </div>
          <div className="savo-pdp-fbt-summary"><small>{selected.size} selected</small><strong>{formatKWD(total)}</strong><button onClick={addBundle}>{p("addBundle")}</button></div>
        </div>
      </div>
    </section>
  );
}
