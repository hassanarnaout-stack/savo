"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatKWD, calcDiscountPct } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { HomeProduct } from "@/lib/homepage-view-model";

/**
 * Discovery Hub — V22 homepage section (src/App.tsx, DiscoveryHub()/PC()).
 * Real production data only — see homepage-view-model.ts (hubTrending/
 * hubBestSellers/hubEditorsPicks). "Top Rated" from the V22 source is
 * NOT included: there is no real product-level rating aggregation
 * anywhere in the schema (avgRating exists only on
 * SupplierPerformanceScore, a supplier metric, not a product one) — a
 * verified gap, reported rather than fabricated. Tab switching is a
 * small client controller over data already fetched server-side —
 * zero refetching per click.
 *
 * Card CTA follows the already-approved SAVO adaptation (cart icon,
 * not "Add" text) rather than reusing the shared ProductCard, since
 * this section's card composition (wide featured slot, rating/review
 * fields entirely omitted) differs enough from the canonical .savo-pc
 * card to need its own homepage-specific rendering — matching the
 * same pattern already used for the PDP rail cards.
 */
type HubTab = "trending" | "bestSellers" | "editorsPicks";

const TABS: { key: HubTab; en: string; ar: string; href: string }[] = [
  { key: "trending", en: "Trending", ar: "الأكثر رواجًا", href: "/products?sort=popular" },
  { key: "bestSellers", en: "Best Sellers", ar: "الأكثر مبيعًا", href: "/products?badge=BEST_SELLER" },
  { key: "editorsPicks", en: "Editor's Picks", ar: "اختيارات المحرر", href: "/products?badge=EDITORS_PICK" },
];

export function DiscoveryHub({ trending, bestSellers, editorsPicks, locale }: { trending: HomeProduct[]; bestSellers: HomeProduct[]; editorsPicks: HomeProduct[]; locale: string }) {
  const [tab, setTab] = useState<HubTab>("trending");
  const isArabic = locale === "ar";
  const addItem = useCartStore((s) => s.addItem);

  const datasets: Record<HubTab, HomeProduct[]> = { trending, bestSellers, editorsPicks };
  const visibleTabs = TABS.filter((t) => datasets[t.key].length > 0);
  const products = datasets[tab] ?? [];
  const activeTabMeta = TABS.find((t) => t.key === tab) ?? visibleTabs[0];

  if (visibleTabs.length === 0) return null;

  return (
    <section className="savo-hub">
      <div className="savo-hub-head">
        <div>
          <p className="savo-products-eyebrow">{isArabic ? "مركز الاكتشاف" : "Discovery Hub"}</p>
          <h2 className="savo-hub-title">{isArabic ? "منتجات تستحق الاكتشاف" : "Products Worth Discovering"}</h2>
        </div>
        {activeTabMeta && <Link href={activeTabMeta.href} className="savo-hub-viewall">{isArabic ? "عرض الكل ←" : "View all →"}</Link>}
      </div>

      <div className="savo-hub-tabs" role="tablist">
        {visibleTabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`savo-hub-tab${tab === t.key ? " is-active" : ""}`} onClick={() => setTab(t.key)}>
            {isArabic ? t.ar : t.en}
          </button>
        ))}
      </div>

      <div className="savo-hub-grid">
        {products.slice(0, 7).map((product, i) => {
          const displayName = isArabic && product.nameAr ? product.nameAr : product.name;
          const discountPct = calcDiscountPct(product.originalPrice, product.price);
          return (
            <Link href={`/products/${product.slug}`} key={`${tab}-${product.id}`} className={`savo-hub-card${i === 0 ? " is-wide" : ""}`}>
              <div className="savo-hub-card-media">
                {product.image ? <Image src={product.image} alt={displayName} fill sizes={i === 0 ? "(max-width: 900px) 100vw, 45vw" : "(max-width: 900px) 44vw, 22vw"} /> : <span className="savo-hub-card-fallback" />}
                {discountPct > 0 && <span className="savo-hub-card-discount">-{discountPct}%</span>}
              </div>
              <div className="savo-hub-card-body">
                <span className="savo-hub-card-brand">{product.brand ?? product.category}</span>
                <h3>{displayName}</h3>
                <div className="savo-hub-card-footer">
                  <div className="savo-hub-card-price">
                    <strong>{formatKWD(product.price)}</strong>
                    {product.originalPrice > product.price && <del>{formatKWD(product.originalPrice)}</del>}
                  </div>
                  <button
                    className="savo-hub-card-add"
                    onClick={(e) => {
                      e.preventDefault();
                      addItem({ productId: product.id, name: product.name, slug: product.slug, image: product.image ?? "/placeholder-product.svg", originalPrice: product.originalPrice, saveoPrice: product.price, stockQty: product.stock }, 1);
                      toast.success(`${displayName} added to cart`);
                    }}
                  >
                    <ShoppingCart size={14} />
                  </button>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
