"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import { toast } from "sonner";
import type { HomepageViewModel } from "@/lib/homepage-view-model";

/**
 * Discover Together — "Complete the Moment" (V22 source: src/App.tsx,
 * DiscoverTogether()). Position: after Inside the Brand, before
 * Mystery Box in V22's exact source order (Mystery Box already
 * pre-existing on the real homepage — this slots in right before it).
 *
 * REAL DATA ONLY — sourced from the existing, real BundleService
 * (Phase 4.3), the SAME service the PDP's BundleOffer already uses.
 * Zero second bundle engine, zero homepage-only pricing: the
 * subtotal/discount/finalPrice shown here come directly from
 * BundleService.calculatePricing(). If no eligible 2-product,
 * zero-reward active Bundle exists, homepage-view-model.ts passes
 * `null` and this section renders nothing (verified during
 * implementation: SAVO currently has exactly one such bundle,
 * "Snack & Sip Combo").
 *
 * Add Bundle reuses the EXACT same commercial logic as the PDP's
 * BundleOffer.handleAddBundle: for PERCENTAGE/FIXED_AMOUNT bundles the
 * discount is spread proportionally across the required items so the
 * cart total lands exactly on bundle.finalPrice; FREE_ITEM bundles
 * zero the reward line instead. Same useCartStore, same addItem —
 * zero homepage-only cart/discount state.
 */
export function DiscoverTogether({ bundle, locale }: { bundle: HomepageViewModel["discoverTogetherBundle"]; locale: string }) {
  const [justAdded, setJustAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  if (!bundle || bundle.items.length !== 2) return null;

  const isArabic = locale === "ar";
  const [a, b] = bundle.items;
  const name = isArabic && bundle.pricing.nameAr ? bundle.pricing.nameAr : bundle.pricing.name;

  function handleAddBundle() {
    if (justAdded || !bundle) return;
    const requiredSubtotal = bundle.items.reduce((sum, p) => sum + p.saveoPrice, 0);
    const discountRate = bundle.discountType === "FREE_ITEM" || requiredSubtotal <= 0 ? 0 : bundle.pricing.discountAmount / requiredSubtotal;

    for (const p of bundle.items) {
      const discountedUnitPrice = Math.max(0, Number((p.saveoPrice * (1 - discountRate)).toFixed(3)));
      addItem({ productId: p.productId, name: p.name, slug: p.slug, image: p.image ?? "/placeholder-product.svg", originalPrice: p.saveoPrice, saveoPrice: discountedUnitPrice, stockQty: 999 }, 1);
    }
    toast.success(isArabic ? "أُضيفت الحزمة للسلة" : "Bundle added to cart");
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  }

  return (
    <section className="savo-together">
      <div className="savo-together-head">
        <p className="savo-products-eyebrow">{isArabic ? "أكمل اللحظة" : "Complete the Moment"}</p>
        <h2 className="savo-together-title">{isArabic ? "اكتشفوا معًا" : "Discover Together"}</h2>
      </div>

      <div className="savo-together-card">
        <Link href={`/products/${a.slug}`} className="savo-together-side">
          {a.image ? <img src={a.image} alt={a.name} /> : <span className="savo-together-fallback" />}
          <span className="savo-together-scrim" />
          <span className="savo-together-info">
            {a.brand && <small>{a.brand}</small>}
            <strong>{isArabic && a.nameAr ? a.nameAr : a.name}</strong>
            <span className="savo-together-price">{formatKWD(a.saveoPrice)}</span>
          </span>
        </Link>

        <div className="savo-together-connector">
          <span className="savo-together-plus">+</span>
          <span className="savo-together-goeswith">{isArabic ? "يتناسب مع" : <>goes well<br />with</>}</span>
        </div>

        <Link href={`/products/${b.slug}`} className="savo-together-side">
          {b.image ? <img src={b.image} alt={b.name} /> : <span className="savo-together-fallback" />}
          <span className="savo-together-scrim" />
          <span className="savo-together-info">
            {b.brand && <small>{b.brand}</small>}
            <strong>{isArabic && b.nameAr ? b.nameAr : b.name}</strong>
            <span className="savo-together-price">{formatKWD(b.saveoPrice)}</span>
          </span>
        </Link>

        <div className="savo-together-panel">
          <span className="savo-together-panel-label">{isArabic ? "سعر الحزمة" : "Bundle price"}</span>
          <strong className="savo-together-panel-price">{formatKWD(bundle.pricing.finalPrice)}</strong>
          <span className="savo-together-panel-save">{isArabic ? "توفير" : "Save"} {formatKWD(bundle.pricing.discountAmount)}</span>
          <button type="button" className="savo-together-cta" onClick={handleAddBundle}>
            {justAdded ? (isArabic ? "أُضيفت ✓" : "Added ✓") : isArabic ? "أضف الحزمة" : "Add Bundle"}
          </button>
          <span className="savo-together-separately">{isArabic ? "أو أضف المنتجات كل على حدة" : "or add items separately"}</span>
        </div>
      </div>
    </section>
  );
}
