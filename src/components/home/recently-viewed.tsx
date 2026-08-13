"use client";

import { useEffect, useState } from "react";
import { ProductRail } from "@/components/product/product-grid";
import { getRecentlyViewedIds } from "@/lib/recently-viewed";
import type { ProductCardData } from "@/components/product/product-card";

export function RecentlyViewed({ title, subtitle }: { title: string; subtitle: string }) {
  const [products, setProducts] = useState<ProductCardData[] | null>(null);

  useEffect(() => {
    const ids = getRecentlyViewedIds();
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    fetch(`/api/products/by-ids?ids=${ids.join(",")}`)
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  // Nothing tracked yet, or still loading — render nothing rather than an
  // empty/awkward section. This is expected for first-time visitors.
  if (!products || products.length === 0) return null;

  return <ProductRail title={title} subtitle={subtitle} products={products} />;
}
