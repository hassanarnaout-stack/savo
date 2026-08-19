"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";

/**
 * Individual Smart Savings (internal: Rescue) card. Client component
 * so it can use the SAME canonical add-to-cart action/button as
 * standard SAVO product cards (savo-pc-add class, ShoppingCart/
 * CheckCircle2 icons) instead of a text CTA — zero new cart
 * implementation, reuses useCartStore.addItem exactly like
 * product-card.tsx does.
 */
export function RescueCard({
  id, name, slug, brandName, originalPrice, saveoPrice, image, discountPct, offerEndsDays, isArabic,
}: {
  id: string; name: string; slug: string; brandName: string | null;
  originalPrice: number; saveoPrice: number; image: string | null;
  discountPct: number; offerEndsDays: number | null; isArabic: boolean;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem({ productId: id, name, slug, image, originalPrice, saveoPrice, stockQty: 99 }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <Link href={`/products/${slug}`} className="savo-rescue-card">
      {image ? <img src={image} alt={name} /> : <span className="savo-rescue-fallback" />}
      <span className="savo-rescue-scrim" />
      {discountPct > 0 && <span className="savo-rescue-discount">-{discountPct}%</span>}
      {offerEndsDays !== null && (
        <span className="savo-rescue-expiry">
          {isArabic ? `صالح حتى ${offerEndsDays} ${offerEndsDays === 1 ? "يوم" : "أيام"}` : `Best before in ${offerEndsDays} day${offerEndsDays === 1 ? "" : "s"}`}
        </span>
      )}
      <span className="savo-rescue-info">
        {brandName && <small>{brandName}</small>}
        <strong>{name}</strong>
        <span className="savo-rescue-footer">
          <span className="savo-rescue-prices">
            <b>{formatKWD(saveoPrice)}</b>
            <s>{formatKWD(originalPrice)}</s>
          </span>
          <button onClick={handleAddToCart} aria-label={isArabic ? "أضف للسلة" : "Add to cart"} className={`savo-pc-add ${added ? "is-added" : ""}`}>
            {added ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
          </button>
        </span>
      </span>
    </Link>
  );
}
