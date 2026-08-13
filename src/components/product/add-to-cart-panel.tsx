"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";
import { MysteryBoxAnalytics } from "@/lib/mystery-box-analytics";
import { trackClientEvent } from "@/lib/track-client-event";

interface ProductInput {
  id: string;
  name: string;
  slug: string;
  image: string;
  originalPrice: number;
  saveoPrice: number;
  stockQty: number;
}

export function AddToCartPanel({
  product,
  isMysteryBox = false,
  userId = null,
}: {
  product: ProductInput;
  isMysteryBox?: boolean;
  userId?: string | null;
}) {
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const p = useTranslations("product");
  const common = useTranslations("common");
  const outOfStock = product.stockQty <= 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-full border border-black/10">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="flex h-11 w-11 items-center justify-center"
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-semibold">{qty}</span>
        <button
          onClick={() => setQty((q) => Math.min(product.stockQty, q + 1))}
          className="flex h-11 w-11 items-center justify-center"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={() => {
          addItem({ productId: product.id, ...product }, qty);
          if (isMysteryBox) MysteryBoxAnalytics.added(product.id, userId, qty);
          trackClientEvent("ADD_TO_CART", { productId: product.id, metadata: { quantity: qty } });
          const sponsoredSlotId = new URLSearchParams(window.location.search).get("sponsored");
          if (sponsoredSlotId) {
            fetch("/api/brand/track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slotId: sponsoredSlotId, eventType: "ADD_TO_CART" }),
            }).catch(() => {});
          }
          toast.success(`${product.name} added to cart`);
        }}
        disabled={outOfStock}
        className="btn-primary flex-1 disabled:bg-saveo-emerald-700/20"
      >
        <ShoppingCart className="h-4 w-4" />
        {outOfStock ? common("outOfStock") : p("addToCart")}
      </button>

      <button
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 hover:border-red-300 hover:text-red-500"
        aria-label="Add to favorites"
      >
        <Heart className="h-4 w-4" />
      </button>
    </div>
  );
}
