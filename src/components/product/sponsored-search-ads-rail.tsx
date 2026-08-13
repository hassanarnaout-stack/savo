"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatKWD } from "@/lib/utils";

interface SponsoredProduct {
  slotId: string;
  productId: string;
  name: string;
  nameAr: string | null;
  slug: string;
  price: number;
  imageUrl: string | null;
}

/**
 * Always rendered as a visually distinct row ABOVE organic search
 * results, with an explicit "Sponsored" label on every item — never
 * mixed into or reordering the organic list below. This component has
 * zero access to the organic query or its ordering.
 */
export function SponsoredSearchAdsRail({ products, locale }: { products: SponsoredProduct[]; locale: string }) {
  useEffect(() => {
    for (const p of products) {
      fetch("/api/brand/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: p.slotId, eventType: "IMPRESSION" }),
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (products.length === 0) return null;

  function handleClick(slotId: string) {
    fetch("/api/brand/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, eventType: "CLICK" }),
    }).catch(() => {});
  }

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {products.map((p) => (
        <Link
          key={p.slotId}
          href={`/products/${p.slug}`}
          onClick={() => handleClick(p.slotId)}
          className="relative rounded-xl2 border border-saveo-gold-200 bg-saveo-gold-50/40 p-3 transition-shadow hover:shadow-md"
        >
          <span className="absolute top-1.5 start-1.5 rounded-full bg-saveo-gold-500 px-2 py-0.5 text-[9px] font-bold text-white">
            {locale === "ar" ? "إعلان ممول" : "Sponsored"}
          </span>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-black/5">
            {p.imageUrl && <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />}
          </div>
          <p className="mt-2 line-clamp-1 text-sm font-medium">{locale === "ar" && p.nameAr ? p.nameAr : p.name}</p>
          <p className="font-bold text-saveo-emerald-700">{formatKWD(p.price)}</p>
        </Link>
      ))}
    </div>
  );
}
