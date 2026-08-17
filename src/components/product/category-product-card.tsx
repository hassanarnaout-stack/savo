"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { formatKWD, calcDiscountPct } from "@/lib/utils";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { BADGE_CONFIG } from "@/components/product/product-badges";
import type { ProductCardData } from "@/components/product/product-card";

/**
 * Category-only card — 1:1 geometry from V22's CategoryPage()'s inline
 * ProductGrid() card (CustomerPages.tsx line ~168), which is a THIRD,
 * distinct card design from the canonical shared .savo-pc AND from
 * DiscoverRailCard's .savo-cp-*. Deliberately a separate component per
 * the Category migration instructions — product-card.tsx,
 * product-grid.tsx, and DiscoverRailCard stay untouched.
 *
 * V22 has no favorite/heart control on this specific card — omitted
 * here for Category only; the shared Favorites feature itself is
 * untouched everywhere else. V22's badge is a real product badge
 * (top-left) using the SAME BADGE_CONFIG labels/colors already used
 * elsewhere — no invented badge text. Add-to-cart is the previously
 * approved icon-only CTA (V22's literal "Add" text button is not
 * restored, matching the earlier locked decision for Discover).
 */
export function CategoryProductCard({ product }: { product: ProductCardData & { badgeType?: string | null } }) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const addItem = useCartStore((s) => s.addItem);
  const image = product.images[0]?.url ?? "/placeholder-product.svg";
  const outOfStock = product.stockQty <= 0;
  const displayName = isArabic && product.nameAr ? product.nameAr : product.name;

  const originalPrice = Number(product.originalPrice);
  const saveoPrice = Number(product.saveoPrice);
  const discountPct = calcDiscountPct(originalPrice, saveoPrice);
  const badge = product.badgeType ? BADGE_CONFIG[product.badgeType] : null;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    addItem({ productId: product.id, name: product.name, slug: product.slug, image, originalPrice, saveoPrice, stockQty: product.stockQty }, 1);
    toast.success(`${displayName} added to cart`);
  }

  return (
    <Link href={`/products/${product.slug}`} className="savo-catpc-card">
      <div className="savo-catpc-media">
        <Image src={image} alt={displayName} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
        <div className="savo-catpc-gradient" />
        {badge && <span className="savo-catpc-badge" style={{ "--badge-color": "var(--savo-shell-discovery)" } as React.CSSProperties}>{isArabic ? badge.ar : badge.en}</span>}
        {discountPct > 0 && <span className="savo-catpc-discount">-{discountPct}%</span>}
      </div>
      <div className="savo-catpc-body">
        {product.brandName && <div className="savo-catpc-brand">{product.brandName}</div>}
        <div className="savo-catpc-name">{displayName}</div>
        <div className="savo-catpc-footer">
          <div className="savo-catpc-price">
            <span className="savo-catpc-price-current">{formatKWD(saveoPrice)}</span>
            {originalPrice > saveoPrice && <span className="savo-catpc-price-original">{formatKWD(originalPrice)}</span>}
          </div>
          <button onClick={handleAddToCart} disabled={outOfStock} className="savo-catpc-add">
            <ShoppingCart className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Link>
  );
}
