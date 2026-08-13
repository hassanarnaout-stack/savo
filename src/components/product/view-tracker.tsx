"use client";

import { useEffect } from "react";
import { trackProductView } from "@/lib/recently-viewed";
import { trackClientEvent } from "@/lib/track-client-event";

export function ViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    trackProductView(productId);
    trackClientEvent("PRODUCT_VIEW", { productId });
  }, [productId]);

  return null;
}
