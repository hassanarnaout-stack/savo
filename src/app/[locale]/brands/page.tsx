import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { brandNameToSlug } from "@/lib/brand-slug";
import { BrandsBrowser } from "@/components/brand/brands-browser";

/**
 * Ported from the latest V22 export (src/CustomerPages.tsx, BrandsPage()).
 * Real production brands only — grouped and counted from Product.brandName
 * (there's no separate Brand model). No Figma demo names (Ferrero Rocher,
 * KitKat, Lindt...).
 *
 * "Featured brands" in V22 shows a curated 4-card row with a one-line
 * description per brand — production has no curation flag or brand
 * description field to back that, so this uses a real, defensible
 * substitute instead: the top 4 real brands by order volume
 * (Product.orderCount), and omits the description line entirely rather
 * than inventing marketing copy. Search is a small client island
 * (BrandsBrowser) — the only genuinely interactive piece of this page.
 */
export default async function BrandsPage() {
  const locale = await getLocale();
  const isArabic = locale === "ar";

  const [rows, catalogBrands] = await Promise.all([
    prisma.product.groupBy({
      by: ["brandName"],
      where: { status: "ACTIVE", approvalStatus: "APPROVED", brandName: { not: null } },
      _count: { _all: true },
      _sum: { orderCount: true },
    }),
    // Real Catalog Brand logos (Phase 2) — merged in by name below.
    // Legacy brandName groups are still the authoritative count/list
    // source (works for every product, linked or not); this only
    // enriches matching entries with a real logoUrl when one exists.
    prisma.brand.findMany({ where: { isActive: true, logoUrl: { not: null } }, select: { name: true, logoUrl: true } }),
  ]);
  const logoByLowerName = new Map(catalogBrands.map((b) => [b.name.toLowerCase(), b.logoUrl]));

  const brands = rows
    .map((r) => ({ name: r.brandName!, productCount: r._count._all, orderVolume: r._sum.orderCount ?? 0, logoUrl: logoByLowerName.get(r.brandName!.toLowerCase()) ?? null }))
    .filter((b) => b.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const featured = [...brands].sort((a, b) => b.orderVolume - a.orderVolume).slice(0, 4);

  return (
    <BrandsBrowser
      brands={brands.map((b) => ({ name: b.name, slug: brandNameToSlug(b.name), productCount: b.productCount, logoUrl: b.logoUrl }))}
      featured={featured.map((b) => ({ name: b.name, slug: brandNameToSlug(b.name), productCount: b.productCount, logoUrl: b.logoUrl }))}
      isArabic={isArabic}
    />
  );
}
