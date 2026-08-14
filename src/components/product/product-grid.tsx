"use client";

import { useTranslations } from "next-intl";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";
import { RecommendationAnalytics, type RecommendationSource } from "@/lib/recommendation-analytics";
import { LuxuryEmptyState } from "@/components/ui/luxury-empty-state";

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  const common = useTranslations("common");

  if (products.length === 0) {
    return <LuxuryEmptyState title={common("noResults")} ctaLabel={common("continueShopping")} ctaHref="/products" />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductRail({
  title,
  subtitle,
  products,
  source,
}: {
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  /** When set, fires "Recommendation Click" analytics on any product click — see src/lib/recommendation-analytics.ts. Omit for rails that aren't a recommendation surface (e.g. a plain "New Arrivals" section). */
  source?: RecommendationSource;
}) {
  if (products.length === 0) return null;

  return (
    <section className="py-6">
      <div className="mb-5">
        <h2 className="font-display text-xl font-extrabold tracking-tight text-saveo-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-saveo-muted">{subtitle}</p>}
      </div>
      <div className="flex gap-3.5 overflow-x-auto pb-2">
        {products.map((p) => (
          <div
            key={p.id}
            className="w-40 shrink-0 sm:w-48"
            onClickCapture={() => source && RecommendationAnalytics.clicked(p.id, source)}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
