"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import { RecommendationAnalytics } from "@/lib/recommendation-analytics";

interface SuggestedProduct {
  id: string;
  name: string;
  nameAr?: string | null;
  slug: string;
  saveoPrice: number;
  images?: { url: string }[];
}

/**
 * SAVO Cart — exact V22 visual transplant (CartDrawerPage, src/CustomerPages.tsx
 * in the V22 export), adapted from a drawer to a standalone page since /cart
 * is a real full route, not an overlay. Real business logic 100% preserved,
 * zero Figma demo state:
 *   - items/quantities/removal: useCartStore (unchanged, same store used
 *     everywhere else in the app)
 *   - savings: totalSavings() from the real store (was a fabricated 18%
 *     flat rate in the Figma prototype)
 *   - the "Empty state" toggle button (Figma design-demo control) removed
 *   - the fake right-side "Page backdrop" panel (a Figma-canvas artifact,
 *     not a real UI element) removed
 *   - the "Complete your deal" cross-sell rail used a hardcoded product
 *     array in Figma; SAVO has no real cart-level cross-sell/bundle system
 *     today, so per the no-fake-data rule this section is omitted rather
 *     than populated with invented products
 */
export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, totalSavings } = useCartStore();
  const locale = useLocale();
  const isArabic = locale === "ar";
  const t = useTranslations("cartPage");
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  // Real "Complete your deal" cross-sell — same canonical /api/cart/complete-your-deal
  // endpoint (backed by CrossSellService.getSmartCartSuggestions) already used by
  // the header cart-drawer. Zero hardcoded products.
  const [suggestions, setSuggestions] = useState<SuggestedProduct[]>([]);
  useEffect(() => {
    if (items.length === 0) return;
    const ids = items.map((i) => i.productId).join(",");
    fetch(`/api/cart/complete-your-deal?productIds=${ids}`)
      .then((r) => r.json())
      .then((data) => {
        const products = data.products ?? [];
        setSuggestions(products);
        for (const p of products) RecommendationAnalytics.viewed(p.id, "smart_cart_suggestion");
      })
      .catch(() => setSuggestions([]));
  }, [items]);

  return (
    <div className="savo-cart-page">
      <div className="savo-cart-panel">
        <div className="savo-cart-header">
          <div className="savo-cart-header-title">
            <span>{t("title")}</span>
            {itemCount > 0 && <span className="savo-cart-count">{itemCount}</span>}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="savo-cart-empty">
            <div className="savo-cart-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--savo-shell-discovery)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <div className="savo-cart-empty-title">{t("emptyTitle")}</div>
            <div className="savo-cart-empty-sub">{t("emptySubtitle")}</div>
            <Link href="/products" className="savo-cart-empty-cta">{t("startShopping")}</Link>
          </div>
        ) : (
          <>
            <div className="savo-cart-items">
              {items.map((item) => {
                const displayName = isArabic && (item as any).nameAr ? (item as any).nameAr : item.name;
                return (
                  <div key={item.productId} className="savo-cart-item">
                    <Link href={`/products/${item.slug}`} className="savo-cart-item-img">
                      {item.image && <Image src={item.image} alt={displayName} fill className="object-cover" />}
                    </Link>
                    <div className="savo-cart-item-body">
                      <Link href={`/products/${item.slug}`} className="savo-cart-item-name">{displayName}</Link>
                      <div className="savo-cart-item-row">
                        <div className="savo-cart-qty">
                          <button onClick={() => updateQty(item.productId, item.quantity - 1)} aria-label="-">−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stockQty} aria-label="+">+</button>
                        </div>
                        <span className="savo-cart-item-price">{formatKWD(item.saveoPrice * item.quantity)}</span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.productId)} aria-label={t("remove")} className="savo-cart-item-remove">×</button>
                  </div>
                );
              })}

              {suggestions.length > 0 && (
                <div className="savo-cart-crosssell">
                  <p className="savo-cart-crosssell-label">{isArabic ? "أكمل صفقتك" : "Complete your deal"}</p>
                  <div className="savo-cart-crosssell-list">
                    {suggestions.map((p) => {
                      const name = isArabic && p.nameAr ? p.nameAr : p.name;
                      const img = p.images?.[0]?.url;
                      return (
                        <div key={p.id} className="savo-cart-crosssell-item">
                          <Link href={`/products/${p.slug}`} className="savo-cart-crosssell-img">
                            {img && <Image src={img} alt={name} fill className="object-cover" />}
                          </Link>
                          <div className="savo-cart-crosssell-body">
                            <Link href={`/products/${p.slug}`} className="savo-cart-crosssell-name">{name}</Link>
                            <span className="savo-cart-crosssell-price">{formatKWD(p.saveoPrice)}</span>
                          </div>
                          <button
                            onClick={() => {
                              useCartStore.getState().addItem({ productId: p.id, name: p.name, slug: p.slug, image: img ?? null, originalPrice: p.saveoPrice, saveoPrice: p.saveoPrice, stockQty: 99 }, 1);
                              RecommendationAnalytics.added(p.id, "smart_cart_suggestion");
                            }}
                            className="savo-cart-crosssell-add"
                          >
                            {isArabic ? "أضف" : "Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="savo-cart-summary">
              <div className="savo-cart-summary-row">
                <span>{t("totalSavings")}</span>
                <span className="savo-cart-summary-savings">−{formatKWD(totalSavings())}</span>
              </div>
              <div className="savo-cart-summary-row savo-cart-summary-total">
                <span>{t("subtotal")}</span>
                <span>{formatKWD(subtotal())}</span>
              </div>
              <Link href="/checkout" className="savo-cart-checkout-cta">{t("proceedToCheckout")} →</Link>
              <div className="savo-cart-secure">{isArabic ? "الدفع آمن" : "Secure checkout"}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
