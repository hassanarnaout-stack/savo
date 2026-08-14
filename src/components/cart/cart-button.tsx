"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart-store";

export function CartButton() {
  const count = useCartStore((s) => s.itemCount());
  const openCart = useCartStore((s) => s.openCart);

  // The cart is persisted in localStorage, which isn't available during
  // server rendering. Rendering the badge only after mount avoids a
  // server/client hydration mismatch (SSR always sees 0 items).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={openCart}
      className="savo-cart-button"
      aria-label="Open cart"
    >
      <ShoppingCart aria-hidden="true" />
      {mounted && count > 0 && (
        <span>
          {count}
        </span>
      )}
    </button>
  );
}
