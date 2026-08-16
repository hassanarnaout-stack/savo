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

/**
 * The favorite button previously had no onClick at all — never wired
 * up. Reuses the exact same canonical favorites implementation
 * already used by ProductCard (product-card.tsx): same /api/favorites
 * POST contract, same optimistic-update pattern, same 401 handling.
 * No new favorites system, no duplicate API logic.
 */
export function AddToCartPanel({
  product,
  isMysteryBox = false,
  userId = null,
  isFavorited: initialFavorited = false,
}: {
  product: ProductInput;
  isMysteryBox?: boolean;
  userId?: string | null;
  isFavorited?: boolean;
}) {
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const p = useTranslations("product");
  const common = useTranslations("common");
  const outOfStock = product.stockQty <= 0;

  const [favorited, setFavorited] = useState(initialFavorited);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  async function handleToggleFavorite() {
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
    <div className="pdp-buy-row">
      <div className="pdp-quantity">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className=""
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </button>
        <output aria-live="polite">{qty}</output>
        <button
          onClick={() => setQty((q) => Math.min(product.stockQty, q + 1))}
          className=""
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
        className="pdp-add-button disabled:opacity-50"
      >
        <ShoppingCart className="h-4 w-4" />
        {outOfStock ? common("outOfStock") : p("addToCart")}
      </button>

      <button
        onClick={handleToggleFavorite}
        disabled={favoriteBusy}
        className={`pdp-wishlist pdp-wishlist-icon${favorited ? " is-liked" : ""}`}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
