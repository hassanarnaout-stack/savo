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
export function ProductCard({ product }: { product: ProductCardData }) {
  const addItem = useCartStore((s) => s.addItem);
  const locale = useLocale();
  const p = useTranslations("product");
  const common = useTranslations("common");
  const image = product.images[0]?.url ?? "/placeholder-product.png";
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
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-card bg-saveo-card font-manrope shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-figma-card"
    >
      <div className="relative aspect-square overflow-hidden bg-saveo-surface">
        <Image
          src={image}
          alt={displayName}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />

        {product.type === "MYSTERY_BOX" ? (
          <span className="absolute start-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-saveo-ink px-2 py-1 text-[10px] font-bold text-white">
            <Gift className="h-3 w-3 text-saveo-primary" /> MYSTERY
          </span>
        ) : (
          discountPct > 0 && (
            <span className="figma-badge-discount absolute start-2.5 top-2.5">
              <span className="figma-badge-dash">-</span>
              {discountPct}%
            </span>
          )
        )}

        <button
          onClick={handleToggleFavorite}
          disabled={favoriteBusy}
          className={`absolute end-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
            favorited ? "bg-saveo-accent" : "bg-white/[0.92]"
          }`}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`h-[13px] w-[13px] ${favorited ? "fill-white text-white" : "fill-transparent text-saveo-muted"}`} strokeWidth={1.8} />
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

      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <div className="flex items-center justify-between">
          {product.dealEndsAt ? (
            <CountdownTimer dealEndsAt={product.dealEndsAt} compact />
          ) : (
            <span />
          )}
        </div>

        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.4] text-saveo-ink">{displayName}</h3>

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
              <span className="text-[10px] text-saveo-muted">({product.orderCount.toLocaleString()})</span>
            )}
          </div>
        ) : null}

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[17px] font-extrabold text-saveo-primary">{formatKWD(saveoPrice)}</span>
          {discountPct > 0 && <span className="text-xs text-saveo-muted line-through">{formatKWD(originalPrice)}</span>}
        </div>
        {discountPct > 0 && (
          <div className="text-[10px] font-semibold text-saveo-primary">
            {p("youSave")} {formatKWD(originalPrice - saveoPrice)}
          </div>
        )}

        <div className="mt-0.5">
          <div className={`text-[10px] font-semibold ${lowStock ? "text-saveo-accent" : "text-saveo-muted"}`}>
            {lowStock ? `Only ${product.stockQty} left!` : `${product.stockQty} in stock`}
          </div>
          <div className="figma-stockbar-track">
            <div className={`figma-stockbar-fill ${lowStock ? "is-low" : ""}`} style={{ width: `${stockPct}%` }} />
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className={`figma-btn-cta mt-2.5 w-full disabled:cursor-not-allowed disabled:bg-saveo-border disabled:text-saveo-muted ${added ? "is-added" : ""}`}
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
    </Link>
  );
}
