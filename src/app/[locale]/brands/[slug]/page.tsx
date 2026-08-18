import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { brandNameToSlug } from "@/lib/brand-slug";
import { ProductGrid } from "@/components/product/product-grid";
import { serializeProducts } from "@/lib/utils";

/**
 * Ported from the latest V22 export (CustomerPages.tsx,
 * BrandDetailPage()). V22's hero includes a fabricated one-line brand
 * description ("French luxury fragrance house...") — production has
 * no real brand description field (brandName is a plain string, no
 * separate Brand model), so that line is omitted rather than invented.
 * Everything else (real brand match, real products, real count, real
 * ProductGrid/ProductCard behavior) is unchanged production logic.
 */
export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [locale, session, common, pT] = await Promise.all([getLocale(), auth(), getTranslations("common"), getTranslations("product")]);
  const isArabic = locale === "ar";
  const membersOnlyFilter = await MembershipService.getVisibilityFilter(session?.user?.id);

  const brandRows = await prisma.product.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED", brandName: { not: null } },
    select: { brandName: true },
    distinct: ["brandName"],
  });
  const matchedBrand = brandRows.find((r) => r.brandName && brandNameToSlug(r.brandName) === slug)?.brandName;
  if (!matchedBrand) notFound();

  // Real Catalog Brand (Phase 2) — enriches the hero with a real logo/
  // cover/description when one exists for this name. Product matching
  // itself stays on brandName exactly as before (works for every
  // product whether or not it's linked to a Brand row yet).
  const catalogBrand = await prisma.brand.findFirst({ where: { name: { equals: matchedBrand, mode: "insensitive" }, isActive: true } });
  const displayName = isArabic && catalogBrand?.nameAr ? catalogBrand.nameAr : matchedBrand;
  const displayDescription = isArabic ? catalogBrand?.descriptionAr : catalogBrand?.description;

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED", ...membersOnlyFilter, brandName: matchedBrand },
    select: {
      id: true, name: true, nameAr: true, slug: true, originalPrice: true, saveoPrice: true, stockQty: true,
      type: true, dealEndsAt: true, images: { take: 1, orderBy: { sortOrder: "asc" } },
      media: { where: { type: "IMAGE_360" }, select: { id: true }, take: 1 },
    },
    orderBy: { orderCount: "desc" },
  });

  return (
    <div className="savo-brand-detail-page">
      <div className="savo-brand-detail-hero">
        {catalogBrand?.coverImageUrl ? (
          <div className="savo-brand-detail-cover" style={{ backgroundImage: `url(${catalogBrand.coverImageUrl})` }} />
        ) : catalogBrand?.logoUrl ? (
          <div className="savo-brand-detail-logo savo-brand-detail-logo--img"><img src={catalogBrand.logoUrl} alt={displayName} /></div>
        ) : (
          <div className="savo-brand-detail-logo">{displayName[0]}</div>
        )}
        <div className="savo-brand-detail-copy">
          <div className="savo-products-eyebrow">{isArabic ? "العلامة التجارية" : "Brand"}</div>
          <h1>{displayName}</h1>
          {displayDescription && <p className="savo-brand-detail-desc">{displayDescription}</p>}
          <div className="savo-brand-detail-stat">
            <div>{products.length}</div>
            <span>{isArabic ? "منتج" : "products"}</span>
          </div>
        </div>
      </div>

      <div className="savo-category-shell">
        <div className="savo-category-toolbar">
          <span className="savo-products-count">
            {products.length} {isArabic ? "منتج" : products.length === 1 ? "product" : "products"}
          </span>
        </div>

        <ProductGrid products={serializeProducts(products.map((pr) => ({ ...pr, has360Media: pr.media.length > 0 }))) as any} noResultsLabel={common("noResults")} continueShoppingLabel={common("continueShopping")} outOfStockLabel={common("outOfStock")} addToCartLabel={pT("addToCart")} locale={locale} />
      </div>
    </div>
  );
}
