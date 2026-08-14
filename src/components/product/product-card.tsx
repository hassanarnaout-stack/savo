"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingCart, Gift, Star, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { CountdownTimer } from "@/components/product/countdown-timer";
import { useCartStore } from "@/store/cart-store";
import { formatKWD, calcDiscountPct } from "@/lib/utils";
import { toast } from "sonner";

export interface ProductCardData {
  id: string;
  name: string;
  nameAr?: string | null;
  brandName?: string | null;
  slug: string;
  originalPrice: number | string;
  saveoPrice: number | string;
  stockQty: number;
  type: "STANDARD" | "DEAL" | "MYSTERY_BOX" | "RESCUE";
  dealEndsAt: string | Date | null;
  images: { url: string; altText: string | null }[];
  discoveryScore?: number | null;
  avgRating?: number | null;
  orderCount?: number | null;
  isFavorited?: boolean;
}

/**
 * Design Language v2 — Figma Make visual parity (PHASE 1).
 * Structural port of Figma Make's `DealCard` (see src/app/App.tsx:225 in the
 * Figma source): ink discount badge, fire wishlist-liked state, teal price +
 * "Save X" line, stock bar, fire CTA. Cart/favorites logic below is
 * byte-for-byte identical to the previous version — only the JSX/classes
 * changed. Figma's `brand` and `categoryEn` row was intentionally NOT
 * reproduced: SAVO's ProductCardData contract has no such fields at this
 * layer, and inventing them would mean fake data — flagged in the PHASE 1
 * report as a known, deliberate gap rather than a silent omission.
 */
export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const addItem = useCartStore((s) => s.addItem);
  const locale = useLocale();
  const p = useTranslations("product");
  const common = useTranslations("common");
  const image = product.images[0]?.url ?? "/placeholder-product.svg";
  const outOfStock = product.stockQty <= 0;
  const displayName = locale === "ar" && product.nameAr ? product.nameAr : product.name;

  const [favorited, setFavorited] = useState(!!product.isFavorited);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [added, setAdded] = useState(false);

  // Presentational-only derived values (no new state beyond the existing
  // component-local pattern, no data contract change).
  const originalPrice = Number(product.originalPrice);
  const saveoPrice = Number(product.saveoPrice);
  const discountPct = calcDiscountPct(originalPrice, saveoPrice);
  const lowStock = !outOfStock && product.stockQty > 0 && product.stockQty <= 5;
  const stockPct = Math.max(0, Math.min(100, Math.round((product.stockQty / 20) * 100))); // 20 units ≈ "full" bar, matches Figma's maxStock-relative bar without needing a maxStock field SAVO doesn't have

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image,
        originalPrice,
        saveoPrice,
        stockQty: product.stockQty,
      },
      1
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800); // mirrors Figma's DealCard added-state timing
    toast.success(`${displayName} added to cart`);
  }

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    const optimistic = !favorited;
    setFavorited(optimistic); // optimistic update — reverted below if the request actually fails
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFavorited(data.favorited);
    } catch {
      setFavorited(!optimistic);
      toast.error("Please sign in to save favorites");
    } finally {
      setFavoriteBusy(false);
    }
  }

  return (
    <article className="product-card group flex flex-col">
      <div className="product-media">
        <Link href={`/products/${product.slug}`} aria-label={displayName} className="product-image-link">
          <Image src={image} alt={displayName} fill sizes="(max-width: 640px) 50vw, 25vw" priority={priority} className="object-cover" />
        </Link>

        {product.type === "MYSTERY_BOX" ? (
          <span className="absolute start-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-saveo-ink px-2 py-1 text-[10px] font-bold text-white">
            <Gift className="h-3 w-3 text-saveo-primary" /> MYSTERY
          </span>
        ) : (
          discountPct > 0 && (
            <span className="discount-badge">
              <span className="figma-badge-dash">-</span>
              {discountPct}%
            </span>
          )
        )}

        <button
          onClick={handleToggleFavorite}
          disabled={favoriteBusy}
          className={`heart-button ${favorited ? "liked" : ""}`}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart strokeWidth={1.8} />
        </button>

        {/* Bottom-left status badges — real signals only (typeof-checked,
            no invented "isNew"/"isBestSeller" flags that don't exist on
            ProductCardData). discoveryScore doubles as the "featured" signal
            already used by the previous card version. */}
        {typeof product.discoveryScore === "number" && product.discoveryScore >= 70 && (
          <div className="absolute bottom-2.5 start-2.5 flex gap-1">
            <span className="figma-badge-new">💎 {product.discoveryScore}</span>
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-saveo-ink px-3 py-1 text-xs font-bold text-white">{common("outOfStock")}</span>
          </div>
        )}
      </div>

      <div className="product-body flex flex-1 flex-col">
        <div className="product-meta">
          <span>{product.brandName ?? "SAVO"}</span>
          {product.dealEndsAt ? (
            <CountdownTimer dealEndsAt={product.dealEndsAt} compact />
          ) : typeof product.avgRating === "number" && product.avgRating > 0 ? (
            <span><Star fill="currentColor" /> {product.avgRating.toFixed(1)}</span>
          ) : (
            <span />
          )}
        </div>

        <Link href={`/products/${product.slug}`} className="product-title">{displayName}</Link>

        {(typeof product.avgRating === "number" && product.avgRating > 0) ||
        (typeof product.orderCount === "number" && product.orderCount > 0) ? (
          <div className="mt-0.5 flex items-center gap-1.5">
            {typeof product.avgRating === "number" && product.avgRating > 0 && (
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="h-2.5 w-2.5"
                    fill={i <= Math.floor(product.avgRating!) ? "#F59E0B" : "transparent"}
                    color={i <= Math.floor(product.avgRating!) ? "#F59E0B" : "#E8E8EA"}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
            )}
            {typeof product.orderCount === "number" && product.orderCount > 0 && (
              <span className="text-[10px] text-saveo-muted">({String(product.orderCount)})</span>
            )}
          </div>
        ) : null}

        <div className="price-row mt-1 flex items-baseline gap-2">
          <strong>{formatKWD(saveoPrice)}</strong>
          {discountPct > 0 && <span className="text-xs text-saveo-muted line-through">{formatKWD(originalPrice)}</span>}
        </div>
        <div className="mt-0.5">
          <div className={`stock-copy ${lowStock ? "is-low" : ""}`}>
            <span>{lowStock ? `Only ${product.stockQty} left!` : `${product.stockQty} in stock`}</span>
            {typeof product.orderCount === "number" && product.orderCount > 0 && <span>{String(product.orderCount)} orders</span>}
          </div>
          <div className="stock-bar">
            <i className={lowStock ? "is-low" : ""} style={{ width: `${stockPct}%` }} />
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className={`add-button disabled:cursor-not-allowed disabled:bg-saveo-border disabled:text-saveo-muted ${added ? "added" : ""}`}
        >
          {added ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Added!
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" />
              {outOfStock ? common("outOfStock") : p("addToCart")}
            </>
          )}
        </button>
      </div>
    </article>
  );
}
