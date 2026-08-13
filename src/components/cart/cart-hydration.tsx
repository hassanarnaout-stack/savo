"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart-store";

/**
 * Renders nothing — just triggers the cart store's deferred localStorage
 * rehydration once the component has mounted on the client. Must be
 * rendered once near the root (see src/app/[locale]/layout.tsx). Paired
 * with `skipHydration: true` in the store's persist config.
 */
export function CartHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
