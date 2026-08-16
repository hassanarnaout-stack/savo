"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingCart, Gift, Star, CheckCircle2, RotateCw } from "lucide-react";
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
  /** True only when this product has a real ProductMedia row with
   * type IMAGE_360. Threaded through from whichever query already
   * fetches the product (products/category/brand/homepage/PDP rails)
   * — never a separate per-card lookup. Optional and defaults to no
   * badge on pages that don't yet pass it through. */
  has360Media?: boolean;
}

/**
 * Ported from the approved V22 source (savo-new/src/App.tsx, PC() —
 * the canonical product-card component used inside DiscoveryHub).
 * Structural/visual replacement of the previous "Figma Make Design
 * Language v2" card — that presentation is retired, not layered
 * under this one. Cart/favorites logic below is unchanged from the
 * previous version (same functions, same state, same API calls) —
 * only the JSX/classes were replaced to match V22.
 *
 * Two real, documented adaptations from the literal V22 PC source:
 * 1. V22's `rating`/`reviews` fields are shown unconditionally (V22
 *    is a static prototype). Here they only render when genuine
 *    `avgRating`/`orderCount` data exists — never fabricated.
 * 2. `CountdownTimer` (for real DEAL/dealEndsAt products) keeps its
 *    existing default styling rather than a V22-matched treatment:
 *    it's a shared component also used by the Product Detail page,
 *    Flash Deal banner/rail, and the Hunt campaign experience — all
 *    out of scope for this card-only migration, and none of those
 *    surfaces should be touched to avoid unintended regressions.
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

  const hasRating = typeof product.avgRating === "number" && product.avgRating > 0;
  const hasOrders = typeof product.orderCount === "number" && product.orderCount > 0;

  return (
    <article className="savo-pc group flex flex-col">
      <div className="savo-pc-media">
        <Link href={`/products/${product.slug}`} aria-label={displayName} className="savo-pc-image-link">
          <Image src={image} alt={displayName} fill sizes="(max-width: 640px) 50vw, 25vw" priority={priority} className="object-cover" />
        </Link>

        {product.type === "MYSTERY_BOX" ? (
          <span className="savo-pc-badge savo-pc-badge--teal">
            <Gift className="h-3 w-3" /> MYSTERY
          </span>
        ) : (
          discountPct > 0 && <span className="savo-pc-discount">-{discountPct}%</span>
        )}

        {typeof product.discoveryScore === "number" && product.discoveryScore >= 70 && (
          <span className="savo-pc-badge savo-pc-badge--gold savo-pc-badge--corner">💎 {product.discoveryScore}</span>
        )}

        {product.has360Media && (
          <span className="savo-pc-360-badge" aria-label="360° view available">
            <RotateCw className="h-3 w-3" /> 360°
          </span>
        )}

        <button
          onClick={handleToggleFavorite}
          disabled={favoriteBusy}
          className={`savo-pc-heart ${favorited ? "is-liked" : ""}`}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart strokeWidth={1.8} fill={favorited ? "currentColor" : "none"} />
        </button>

        {outOfStock && (
          <div className="savo-pc-oos">
            <span>{common("outOfStock")}</span>
          </div>
        )}
      </div>

      <div className="savo-pc-body flex flex-1 flex-col">
        <div className="savo-pc-brand">{product.brandName ?? "SAVO"}</div>
        <Link href={`/products/${product.slug}`} className="savo-pc-title">{displayName}</Link>

        {product.dealEndsAt && (
          <div className="savo-pc-countdown">
            <CountdownTimer dealEndsAt={product.dealEndsAt} compact />
          </div>
        )}

        {(hasRating || hasOrders) && (
          <div className="savo-pc-rating">
            {hasRating && (
              <span className="savo-pc-stars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} fill={i <= Math.round(product.avgRating!) ? "currentColor" : "none"} strokeWidth={1.5} />
                ))}
              </span>
            )}
            {hasRating && <span className="savo-pc-rating-value">{product.avgRating!.toFixed(1)}</span>}
            {hasOrders && <span className="savo-pc-rating-count">({String(product.orderCount)})</span>}
          </div>
        )}

        {lowStock && <div className="savo-pc-signal savo-pc-signal--fire">Only {product.stockQty} left</div>}
        {!lowStock && hasOrders && <div className="savo-pc-signal">{String(product.orderCount)} orders</div>}

        <div className="savo-pc-footer">
          <div className="savo-pc-price">
            <strong>{formatKWD(saveoPrice)}</strong>
            {discountPct > 0 && <del>{formatKWD(originalPrice)}</del>}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className={`savo-pc-add ${added ? "is-added" : ""}`}
          >
            {added ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Added
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                {outOfStock ? common("outOfStock") : p("addToCart")}
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
