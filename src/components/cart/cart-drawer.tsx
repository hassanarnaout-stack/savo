"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import type { ProductCardData } from "@/components/product/product-card";
import { RecommendationAnalytics } from "@/lib/recommendation-analytics";
import { LuxuryEmptyState } from "@/components/ui/luxury-empty-state";

/**
 * SAVO Quick Cart Drawer — same V22 visual system as the standalone
 * /cart page (reuses .savo-cart-* classes directly, so both stay
 * visually identical by construction rather than two hand-matched
 * designs). Only the outer shell differs: a slide-in overlay instead
 * of a full page. ALL real logic (focus trap, Escape/Tab handling,
 * scroll lock, mobile-nav coordination, real Complete-your-deal via
 * the same /api/cart/complete-your-deal endpoint) is unchanged.
 */
export function CartDrawer() {
  const { isOpen, closeCart, items, updateQty, removeItem, subtotal, totalSavings } = useCartStore();
  const [suggestions, setSuggestions] = useState<ProductCardData[]>([]);
  const locale = useLocale();
  const isArabic = locale === "ar";
  const t = useTranslations("cart");
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeForMenu = () => closeCart();
    window.addEventListener("savo:mobile-nav-open", closeForMenu);
    return () => window.removeEventListener("savo:mobile-nav-open", closeForMenu);
  }, [closeCart]);

  useEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(new Event("savo:cart-open"));
    const scrollRegion = document.querySelector<HTMLElement>(".store-scroll");
    const previousBodyOverflow = document.body.style.overflow;
    const previousRegionOverflow = scrollRegion?.style.overflow;
    const previousScrollTop = scrollRegion?.scrollTop ?? 0;
    document.body.style.overflow = "hidden";
    if (scrollRegion) scrollRegion.style.overflow = "hidden";

    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { closeCart(); return; }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (scrollRegion) {
        scrollRegion.style.overflow = previousRegionOverflow ?? "";
        scrollRegion.scrollTop = previousScrollTop;
      }
      document.querySelector<HTMLElement>("[data-cart-trigger]")?.focus();
    };
  }, [isOpen, closeCart]);

  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const ids = items.map((i) => i.productId).join(",");
    fetch(`/api/cart/complete-your-deal?productIds=${ids}`)
      .then((r) => r.json())
      .then((data) => {
        const products = data.products ?? [];
        setSuggestions(products);
        for (const p of products) RecommendationAnalytics.viewed(p.id, "smart_cart_suggestion");
      })
      .catch(() => setSuggestions([]));
  }, [isOpen, items]);

  if (!isOpen) return null;

  return (
    <div className="savo-cart-drawer-backdrop" onClick={closeCart}>
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-label={t("title")} className="savo-cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="savo-cart-header">
          <div className="savo-cart-header-title">
            <span>{t("title")}</span>
            {items.length > 0 && <span className="savo-cart-count">{items.reduce((s, i) => s + i.quantity, 0)}</span>}
          </div>
          <button onClick={closeCart} aria-label="Close cart" className="savo-cart-drawer-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <LuxuryEmptyState title={t("empty")} ctaLabel={t("startShopping")} ctaHref="/products" onCtaClick={closeCart} />
        ) : (
          <>
            <div className="savo-cart-items">
              {items.map((item) => {
                const displayName = isArabic && (item as any).nameAr ? (item as any).nameAr : item.name;
                return (
                  <div key={item.productId} className="savo-cart-item">
                    <div className="savo-cart-item-img">
                      {item.image && <Image src={item.image} alt={displayName} fill sizes="64px" className="object-cover" />}
                    </div>
                    <div className="savo-cart-item-body">
                      <span className="savo-cart-item-name">{displayName}</span>
                      <div className="savo-cart-item-row">
                        <div className="savo-cart-qty">
                          <button onClick={() => updateQty(item.productId, item.quantity - 1)} aria-label="-">−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stockQty} aria-label="+">+</button>
                        </div>
                        <span className="savo-cart-item-price">{formatKWD(item.saveoPrice * item.quantity)}</span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.productId)} aria-label="Remove item" className="savo-cart-item-remove">×</button>
                  </div>
                );
              })}

              {suggestions.length > 0 && (
                <div className="savo-cart-crosssell">
                  <p className="savo-cart-crosssell-label">{t("completeYourDeal")}</p>
                  <div className="savo-cart-crosssell-list">
                    {suggestions.map((p) => (
                      <MiniAddCard key={p.id} product={p} locale={locale} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="savo-cart-summary">
              <div className="savo-cart-summary-row">
                <span>{t("youSave")}</span>
                <span className="savo-cart-summary-savings">−{formatKWD(totalSavings())}</span>
              </div>
              <div className="savo-cart-summary-row savo-cart-summary-total">
                <span>{t("subtotal")}</span>
                <span>{formatKWD(subtotal())}</span>
              </div>
              <Link href="/checkout" onClick={closeCart} className="savo-cart-checkout-cta">{t("checkout")} →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MiniAddCard({ product, locale }: { product: ProductCardData; locale: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const image = product.images[0]?.url ?? "/placeholder-product.svg";
  const displayName = locale === "ar" && product.nameAr ? product.nameAr : product.name;

  return (
    <div className="savo-cart-crosssell-item">
      <div className="savo-cart-crosssell-img">
        <Image src={image} alt={displayName} fill sizes="112px" className="object-cover" />
      </div>
      <div className="savo-cart-crosssell-body">
        <span className="savo-cart-crosssell-name">{displayName}</span>
        <span className="savo-cart-crosssell-price">{formatKWD(Number(product.saveoPrice))}</span>
      </div>
      <button
        onClick={() => {
          addItem(
            {
              productId: product.id,
              name: product.name,
              slug: product.slug,
              image,
              originalPrice: Number(product.originalPrice),
              saveoPrice: Number(product.saveoPrice),
              stockQty: product.stockQty,
            },
            1
          );
          RecommendationAnalytics.added(product.id, "smart_cart_suggestion");
        }}
        className="savo-cart-crosssell-add"
      >
        + Add
      </button>
    </div>
  );
}
