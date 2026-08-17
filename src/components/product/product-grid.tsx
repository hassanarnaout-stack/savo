"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";
import { RecommendationAnalytics, type RecommendationSource } from "@/lib/recommendation-analytics";

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  const common = useTranslations("common");

  if (products.length === 0) {
    return (
      <div className="savo-products-empty">
        <div className="savo-products-empty-title">{common("noResults")}</div>
        <Link href="/products" className="savo-products-empty-cta">{common("continueShopping")}</Link>
      </div>
    );
  }

  return (
    <div className="savo-product-grid">
      {products.map((p, index) => (
        <ProductCard key={p.id} product={p} priority={index < 4} />
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
    <section className="savo-pdp-section">
      <div className="savo-pdp-section-head">
        <h2 className="savo-pdp-rail-title">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-saveo-muted">{subtitle}</p>}
      </div>
      <div className="savo-pdp-rail-row">
        {products.map((p) => (
          <div
            key={p.id}
            className="savo-pdp-rail-item"
            onClickCapture={() => source && RecommendationAnalytics.clicked(p.id, source)}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
