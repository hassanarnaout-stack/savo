"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { X, Minus, Plus, Trash2, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import type { ProductCardData } from "@/components/product/product-card";
import { RecommendationAnalytics } from "@/lib/recommendation-analytics";
import { LuxuryEmptyState } from "@/components/ui/luxury-empty-state";

export function CartDrawer() {
  const { isOpen, closeCart, items, updateQty, removeItem, subtotal, totalSavings } = useCartStore();
  const [suggestions, setSuggestions] = useState<ProductCardData[]>([]);
  const locale = useLocale();
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={closeCart} />
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-label={t("title")} className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl animate-fade-up">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="text-lg font-bold">{t("title")} ({items.length})</h2>
          <button onClick={closeCart} aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <LuxuryEmptyState title={t("empty")} ctaLabel={t("startShopping")} ctaHref="/products" onCtaClick={closeCart} />
          ) : (
            <>
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-saveo-emerald-700/5">
                      {item.image && (
                        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                      <p className="text-sm font-bold text-saveo-emerald-600">
                        {formatKWD(item.saveoPrice)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.productId, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.stockQty}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="ms-auto text-saveo-emerald-700/40 hover:text-red-500"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Complete your deal */}
              {suggestions.length > 0 && (
                <div className="mt-6 rounded-xl2 bg-saveo-emerald-50 p-4">
                  <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-saveo-emerald-800">
                    <Sparkles className="h-4 w-4" />
                    {t("completeYourDeal")}
                  </div>
                  <div className="flex gap-3 overflow-x-auto">
                    {suggestions.map((p) => (
                      <MiniAddCard key={p.id} product={p} locale={locale} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-black/5 px-5 py-4">
            <div className="mb-1 flex justify-between text-sm text-saveo-emerald-700/60">
              <span>{t("youSave")}</span>
              <span className="font-semibold text-saveo-emerald-600">{formatKWD(totalSavings())}</span>
            </div>
            <div className="mb-4 flex justify-between text-base font-bold">
              <span>{t("subtotal")}</span>
              <span>{formatKWD(subtotal())}</span>
            </div>
            <Link href="/checkout" onClick={closeCart} className="btn-primary w-full">
              {t("checkout")}
            </Link>
          </div>
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
    <div className="w-28 shrink-0 rounded-lg bg-white p-2 shadow-sm">
      <div className="relative h-16 w-full overflow-hidden rounded bg-saveo-emerald-700/5">
        <Image src={image} alt={displayName} fill sizes="112px" className="object-cover" />
      </div>
      <p className="mt-1 line-clamp-1 text-[11px] font-medium">{displayName}</p>
      <p className="text-[11px] font-bold text-saveo-emerald-600">{formatKWD(Number(product.saveoPrice))}</p>
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
        className="mt-1 w-full rounded-full bg-saveo-emerald-700 py-1 text-[10px] font-bold text-white"
      >
        + Add
      </button>
    </div>
  );
}
