"use client";

import { Link } from "@/i18n/routing";
import { ProductCard, type ProductCardData } from "@/components/product/product-card";
import { RecommendationAnalytics, type RecommendationSource } from "@/lib/recommendation-analytics";

export function ProductGrid({
  products,
  noResultsLabel = "No results found",
  continueShoppingLabel = "Continue shopping",
  locale = "en",
  outOfStockLabel = "Out of stock",
  addToCartLabel = "Add to cart",
}: {
  products: ProductCardData[];
  noResultsLabel?: string;
  continueShoppingLabel?: string;
  locale?: string;
  outOfStockLabel?: string;
  addToCartLabel?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="savo-products-empty">
        <div className="savo-products-empty-title">{noResultsLabel}</div>
        <Link href="/products" className="savo-products-empty-cta">{continueShoppingLabel}</Link>
      </div>
    );
  }

  return (
    <div className="savo-product-grid">
      {products.map((p, index) => (
        <ProductCard key={p.id} product={p} priority={index < 4} locale={locale} outOfStockLabel={outOfStockLabel} addToCartLabel={addToCartLabel} />
      ))}
    </div>
  );
}

export function ProductRail({
  title,
  subtitle,
  products,
  source,
  locale = "en",
  outOfStockLabel = "Out of stock",
  addToCartLabel = "Add to cart",
}: {
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  source?: RecommendationSource;
  locale?: string;
  outOfStockLabel?: string;
  addToCartLabel?: string;
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
            <ProductCard product={p} locale={locale} outOfStockLabel={outOfStockLabel} addToCartLabel={addToCartLabel} />
          </div>
        ))}
      </div>
    </section>
  );
}
