"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useCartStore } from "@/store/cart-store";
import { formatKWD, calcDiscountPct } from "@/lib/utils";
import { toast } from "sonner";
import type { ProductCardData } from "@/components/product/product-card";
import { RecommendationAnalytics, type RecommendationSource } from "@/lib/recommendation-analytics";

/**
 * PDP-only rail card — V22 PDPCard() (src/ProductDetail.tsx line ~100),
 * used ONLY for the two actual PDP recommendation rails (cross-sell
 * "Goes great with this", upsell "You might prefer"). NOT used for
 * Related Products, which V22 renders as a grid with a different card
 * (matches CategoryProductCard's geometry, not this one) — that
 * section keeps the existing canonical ProductGrid, unchanged.
 *
 * Unlike DiscoverRailCard, V22's PDPCard has a real favorite heart —
 * kept here (backed by the same real /api/favorites toggle used
 * everywhere else). Add-to-cart is the previously-approved icon-only
 * CTA, not V22's literal "Add" text.
 */
export function PdpRailCard({ product, source, locale = "en" }: { product: ProductCardData; source?: RecommendationSource; locale?: string }) {
  const isArabic = locale === "ar";
  const addItem = useCartStore((s) => s.addItem);
  const image = product.images[0]?.url ?? "/placeholder-product.svg";
  const outOfStock = product.stockQty <= 0;
  const displayName = isArabic && product.nameAr ? product.nameAr : product.name;

  const [favorited, setFavorited] = useState(!!product.isFavorited);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const originalPrice = Number(product.originalPrice);
  const saveoPrice = Number(product.saveoPrice);
  const discountPct = calcDiscountPct(originalPrice, saveoPrice);

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
    <Link href={`/products/${product.slug}`} className="savo-pdprail-card" onClickCapture={() => source && RecommendationAnalytics.clicked(product.id, source)}>
      <div className="savo-pdprail-media">
        <Image src={image} alt={displayName} fill sizes="200px" className="object-cover" />
        <div className="savo-pdprail-gradient" />
        {discountPct > 0 && <span className="savo-pdprail-discount">-{discountPct}%</span>}
        <button onClick={handleToggleFavorite} disabled={favoriteBusy} className={`savo-pdprail-heart${favorited ? " is-liked" : ""}`} aria-label="Toggle favorite">
          <Heart className="h-3 w-3" fill={favorited ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="savo-pdprail-body">
        {product.brandName && <div className="savo-pdprail-brand">{product.brandName}</div>}
        <div className="savo-pdprail-name">{displayName}</div>
        <div className="savo-pdprail-footer">
          <div className="savo-pdprail-price">
            <span className="savo-pdprail-price-current">{formatKWD(saveoPrice)}</span>
            {originalPrice > saveoPrice && <span className="savo-pdprail-price-original">{formatKWD(originalPrice)}</span>}
          </div>
          <button onClick={handleAddToCart} disabled={outOfStock} className="savo-pdprail-add">
            <ShoppingCart className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Link>
  );
}
