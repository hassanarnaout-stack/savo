import { getTranslations } from "next-intl/server";
import { getCrossSell, getUpsell, getRelatedProducts, getFrequentlyBoughtTogether } from "@/lib/recommendations";
import type { ProductCard } from "@/lib/services/cross-sell-service";
import { SmartComparisonService } from "@/lib/services/smart-comparison-service";
import { SmartComparison } from "@/components/product/smart-comparison";
import { FrequentlyBoughtTogether } from "@/components/product/frequently-bought-together";
import { PdpRailCard } from "@/components/product/pdp-rail-card";
import { PdpRailNav } from "@/components/product/pdp-rail-nav";
import { RecommendationAnalytics } from "@/lib/recommendation-analytics";
import { serializeProducts } from "@/lib/utils";

export type PdpKnownAnchor = ProductCard & { categoryId: string; supplierId: string; brand: string | null };

export async function PdpComparisonStream({ productId, locale }: { productId: string; locale: string }) {
  const comparison = await SmartComparisonService.getComparableProducts(productId, 3);
  return <SmartComparison current={comparison.current} alternatives={comparison.alternatives} locale={locale} />;
}

export async function PdpFbtStream({ productId, knownAnchor, userId, locale }: { productId: string; knownAnchor: PdpKnownAnchor; userId?: string; locale: string }) {
  const [fbt, p] = await Promise.all([getFrequentlyBoughtTogether(productId, knownAnchor), getTranslations("product")]);
  if (fbt.length <= 1) return null;
  for (const item of fbt) RecommendationAnalytics.viewed(item.id, "frequently_bought_together", userId);
  return <FrequentlyBoughtTogether items={serializeProducts(fbt) as any} locale={locale} title={p("fbtTitle")} addBundleLabel={p("addBundle")} />;
}

export async function PdpCrossSellStream({ productId, categoryId, userId, title, locale }: { productId: string; categoryId: string; userId?: string; title: string; locale: string }) {
  const crossSell = await getCrossSell(productId, categoryId);
  if (crossSell.length === 0) return null;
  for (const item of crossSell) RecommendationAnalytics.viewed(item.id, "cross_sell", userId);
  return (
    <section className="savo-pdp-section">
      <h2 className="savo-pdp-rail-title" style={{ marginBottom: 24 }}>{title}</h2>
      <PdpRailNav>
        {serializeProducts(crossSell).map((product: any) => <PdpRailCard key={product.id} product={product} source="cross_sell" locale={locale} />)}
      </PdpRailNav>
    </section>
  );
}

export async function PdpUpsellStream({ productId, categoryId, userId, title, locale }: { productId: string; categoryId: string; userId?: string; title: string; locale: string }) {
  const upsell = await getUpsell(productId, categoryId);
  if (upsell.length === 0) return null;
  for (const item of upsell) RecommendationAnalytics.viewed(item.id, "upsell", userId);
  return (
    <section className="savo-pdp-section">
      <h2 className="savo-pdp-rail-title" style={{ marginBottom: 24 }}>{title}</h2>
      <PdpRailNav>
        {serializeProducts(upsell).map((product: any) => <PdpRailCard key={product.id} product={product} source="upsell" locale={locale} />)}
      </PdpRailNav>
    </section>
  );
}

/**
 * "Related Products" — PDP-specific rail pattern (PdpRailCard inside
 * PdpRailNav, which itself wraps the same .savo-pdprail-row). Zero new
 * card component, zero duplicated CSS. getRelatedProducts()/
 * CrossSellService untouched here — the Mystery Box exclusion lives in
 * cross-sell-service.ts itself.
 */
export async function PdpRelatedStream({ productId, categoryId, brand, supplierId, userId, title, locale }: { productId: string; categoryId: string; brand: string | null; supplierId: string; userId?: string; title: string; locale: string }) {
  const related = await getRelatedProducts(productId, { categoryId, brand, supplierId });
  if (related.length === 0) return null;
  for (const item of related) RecommendationAnalytics.viewed(item.id, "related_products", userId);
  return (
    <section className="savo-pdp-section">
      <h2 className="savo-pdp-rail-title" style={{ marginBottom: 24 }}>{title}</h2>
      <PdpRailNav>
        {serializeProducts(related).map((product: any) => <PdpRailCard key={product.id} product={product} source="related_products" locale={locale} />)}
      </PdpRailNav>
    </section>
  );
}
