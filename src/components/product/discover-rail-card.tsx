"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { formatKWD, calcDiscountPct } from "@/lib/utils";
import { toast } from "sonner";
import type { ProductCardData } from "@/components/product/product-card";

/**
 * Discover-only card. Ported 1:1 from the latest V22 export
 * (src/CustomerPages.tsx, CPCard()) — exact DOM/CSS: 200px fixed
 * width, 210px media, badge/discount/heart positions, body padding,
 * price/Add row. Deliberately NOT the shared canonical ProductCard —
 * this task explicitly asked for V22's literal rail-card structure on
 * Discover specifically ("Do NOT keep the current production
 * ProductCard body and patch CSS over it"), and per its own strict
 * scope ("Do NOT touch any other page"), the shared ProductRail/
 * ProductCard used by PDP and Category stay untouched. Business logic
 * (cart add, favorite toggle, same /api/favorites contract) is
 * copied unchanged from product-card.tsx — same functions, same
 * state shape, same API calls, only the JSX/classes differ.
 */
export function DiscoverRailCard({ product }: { product: ProductCardData }) {
  const addItem = useCartStore((s) => s.addItem);
  const locale = useLocale();
  const p = useTranslations("product");
  const image = product.images[0]?.url ?? "/placeholder-product.svg";
  const outOfStock = product.stockQty <= 0;
  const displayName = locale === "ar" && product.nameAr ? product.nameAr : product.name;

  const [favorited, setFavorited] = useState(!!product.isFavorited);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const originalPrice = Number(product.originalPrice);
  const saveoPrice = Number(product.saveoPrice);
  const discountPct = calcDiscountPct(originalPrice, saveoPrice);
  const lowStock = !outOfStock && product.stockQty > 0 && product.stockQty <= 5;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    addItem({ productId: product.id, name: product.name, slug: product.slug, image, originalPrice, saveoPrice, stockQty: product.stockQty }, 1);
    toast.success(`${displayName} added to cart`);
  }

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    const optimistic = !favorited;
    setFavorited(optimistic);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (res.status === 401) {
        setFavorited(!optimistic);
        toast.error("Sign in to save favorites");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFavorited(data.favorited);
    } catch {
      setFavorited(!optimistic);
      toast.error("Could not update favorites");
    } finally {
      setFavoriteBusy(false);
    }
  }

  return (
    <Link href={`/products/${product.slug}`} className="savo-cp-card">
      <div className="savo-cp-media">
        <Image src={image} alt={displayName} fill sizes="200px" className="object-cover" />
        <div className="savo-cp-gradient" />
        {discountPct > 0 && <span className="savo-cp-discount">-{discountPct}%</span>}
        <button onClick={handleToggleFavorite} disabled={favoriteBusy} className={`savo-cp-heart${favorited ? " is-liked" : ""}`} aria-label="Toggle favorite">
          <Heart className="h-3 w-3" fill={favorited ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="savo-cp-body">
        {product.brandName && <div className="savo-cp-brand">{product.brandName}</div>}
        <div className="savo-cp-name">{displayName}</div>
        {lowStock && <div className="savo-cp-signal">{p("onlyLeft", { count: product.stockQty })}</div>}
        <div className="savo-cp-footer">
          <div className="savo-cp-price">
            <span className="savo-cp-price-current">{formatKWD(saveoPrice)}</span>
            {originalPrice > saveoPrice && <span className="savo-cp-price-original">{formatKWD(originalPrice)}</span>}
          </div>
          <button onClick={handleAddToCart} disabled={outOfStock} className="savo-cp-add">
            <ShoppingCart className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Link>
  );
}
