"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import { LuxuryEmptyState } from "@/components/ui/luxury-empty-state";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, totalSavings } = useCartStore();
  const locale = useLocale();
  const t = useTranslations("cartPage");

  if (items.length === 0) {
    return <LuxuryEmptyState title={t("emptyTitle")} subtitle={t("emptySubtitle")} ctaLabel={t("startShopping")} ctaHref="/products" />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="space-y-4 lg:col-span-2">
          {items.map((item) => {
            const displayName = locale === "ar" && (item as any).nameAr ? (item as any).nameAr : item.name;
            return (
              <li key={item.productId} className="card flex gap-4 p-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-saveo-emerald-700/5">
                  {item.image && <Image src={item.image} alt={displayName} fill className="object-cover" />}
                </div>
                <div className="flex-1">
                  <Link href={`/products/${item.slug}`} className="font-semibold hover:text-saveo-emerald-600">
                    {displayName}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-bold text-saveo-emerald-600">{formatKWD(item.saveoPrice)}</span>
                    {item.originalPrice > item.saveoPrice && (
                      <span className="text-xs text-saveo-emerald-700/40 line-through">
                        {formatKWD(item.originalPrice)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stockQty}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="ms-4 flex items-center gap-1 text-xs text-saveo-emerald-700/40 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("remove")}
                    </button>
                  </div>
                </div>
                <div className="text-end font-bold">{formatKWD(item.saveoPrice * item.quantity)}</div>
              </li>
            );
          })}
        </ul>

        <div className="card h-fit p-5">
          <h2 className="mb-4 font-bold">{t("orderSummary")}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-saveo-emerald-700/60">
              <span>{t("totalSavings")}</span>
              <span className="font-semibold text-saveo-emerald-600">{formatKWD(totalSavings())}</span>
            </div>
            <div className="flex justify-between border-t border-black/5 pt-2 text-base font-bold">
              <span>{t("subtotal")}</span>
              <span>{formatKWD(subtotal())}</span>
            </div>
          </div>
          <Link href="/checkout" className="btn-primary mt-5 w-full">
            {t("proceedToCheckout")}
          </Link>
        </div>
      </div>
    </div>
  );
}
