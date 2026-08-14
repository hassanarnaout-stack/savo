"use client";

import Image from "next/image";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import { RecommendationAnalytics } from "@/lib/recommendation-analytics";
import { Tag } from "lucide-react";
import { toast } from "sonner";

export interface BundleOfferData {
  bundleId: string;
  name: string;
  nameAr: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_ITEM";
  requiredProducts: {
    productId: string;
    name: string;
    quantity: number;
    saveoPrice: number;
    slug: string;
    image: string | null;
  }[];
  rewardProduct: { productId: string; name: string; saveoPrice: number; slug: string; image: string | null } | null;
  subtotal: number;
  discountAmount: number;
  finalPrice: number;
}

export function BundleOffer({ bundle, locale }: { bundle: BundleOfferData; locale: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const name = locale === "ar" && bundle.nameAr ? bundle.nameAr : bundle.name;

  function handleAddBundle() {
    // For PERCENTAGE/FIXED_AMOUNT bundles, the discount applies across the
    // required items — spread it proportionally so each cart line reflects
    // its share, and the cart/checkout total ends up exactly at
    // bundle.finalPrice. For FREE_ITEM bundles, required items stay at
    // full price and only the reward line goes to 0 (below).
    const requiredSubtotal = bundle.requiredProducts.reduce((sum, p) => sum + p.saveoPrice * p.quantity, 0);
    const discountRate =
      bundle.discountType === "FREE_ITEM" || requiredSubtotal <= 0
        ? 0
        : bundle.discountAmount / requiredSubtotal;

    for (const p of bundle.requiredProducts) {
      const discountedUnitPrice = Math.max(0, Number((p.saveoPrice * (1 - discountRate)).toFixed(3)));
      addItem(
        {
          productId: p.productId,
          name: p.name,
          slug: p.slug,
          image: p.image ?? "/placeholder-product.svg",
          originalPrice: p.saveoPrice,
          saveoPrice: discountedUnitPrice,
          stockQty: 999,
        },
        p.quantity
      );
      RecommendationAnalytics.added(p.productId, "bundle");
    }
    if (bundle.rewardProduct) {
      addItem(
        {
          productId: bundle.rewardProduct.productId,
          name: bundle.rewardProduct.name,
          slug: bundle.rewardProduct.slug,
          image: bundle.rewardProduct.image ?? "/placeholder-product.svg",
          originalPrice: bundle.rewardProduct.saveoPrice,
          saveoPrice: bundle.discountType === "FREE_ITEM" ? 0 : bundle.rewardProduct.saveoPrice,
          stockQty: 999,
        },
        1
      );
      RecommendationAnalytics.added(bundle.rewardProduct.productId, "bundle");
    }
    toast.success(locale === "ar" ? "أُضيفت الحزمة للسلة" : "Bundle added to cart");
  }

  const allItems = [
    ...bundle.requiredProducts,
    ...(bundle.rewardProduct ? [{ ...bundle.rewardProduct, quantity: 1 }] : []),
  ];

  return (
    <div className="rounded-xl2 border border-saveo-gold-300 bg-saveo-gold-50 p-5">
      <p className="flex items-center gap-1.5 text-sm font-bold text-saveo-emerald-800">
        <Tag className="h-4 w-4 text-saveo-gold-600" /> {name}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {allItems.map((item, i) => (
          <div key={item.productId} className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-black/5">
                {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
              </div>
              <span className="text-xs font-medium">
                {item.name}
                {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                {bundle.rewardProduct?.productId === item.productId && (
                  <span className="ms-1 text-[10px] font-bold text-saveo-emerald-600">
                    {locale === "ar" ? "مجاناً" : "FREE"}
                  </span>
                )}
              </span>
            </div>
            {i < allItems.length - 1 && <span className="text-saveo-emerald-700/40">+</span>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-saveo-emerald-700/40 line-through">{formatKWD(bundle.subtotal)}</span>{" "}
          <span className="font-extrabold text-saveo-emerald-700">{formatKWD(bundle.finalPrice)}</span>
        </div>
        <button onClick={handleAddBundle} className="btn-primary !py-2 text-sm">
          {locale === "ar" ? "أضف الحزمة" : "Add Bundle"}
        </button>
      </div>
    </div>
  );
}
