"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
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
      className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-saveo-emerald-700/5"
      aria-label="Open cart"
    >
      <ShoppingBag className="h-5 w-5" />
      {mounted && count > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-saveo-emerald-700 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
