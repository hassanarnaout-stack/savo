import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductFilters } from "@/components/product/product-filters";
import { serializeProducts } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { SponsoredSlotService } from "@/lib/services/sponsored-slot-service";
import { SponsoredSearchAdsRail } from "@/components/product/sponsored-search-ads-rail";
import { DiscoveryPoint } from "@/components/brand/discovery-point";
import { parseProductFilters, buildProductWhere, buildProductOrderBy, type ProductFilterParams } from "@/lib/product-filters";

export const revalidate = 30;

/** V22's "Load more" grows the visible count in place rather than replacing the page (page N shows PAGE_SIZE*N results). Each click is still a real, bounded `take` query — never the full catalog. */
const PAGE_SIZE = 16;

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ProductFilterParams>;
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const isArabic = locale === "ar";
  const rawParams = await searchParams;
  const filters = parseProductFilters(rawParams);
  const [t, common, pT, session] = await Promise.all([
    getTranslations("productsPage"),
    getTranslations("common"),
    getTranslations("product"),
    auth(),
  ]);
  const membersOnlyVisibility = await MembershipService.getVisibilityFilter(session?.user?.id);

  const where = buildProductWhere(filters, membersOnlyVisibility);
  const orderBy = buildProductOrderBy(filters.sort);
  const take = filters.page * PAGE_SIZE;

  const [categories, brandRows, totalCount, visibleProducts] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({ where: { status: "ACTIVE", approvalStatus: "APPROVED" }, select: { brandName: true }, distinct: ["brandName"] }),
    // Same `where` as the grid query below — count and progress always match what's actually shown.
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, take, include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, media: { where: { type: "IMAGE_360" }, select: { id: true }, take: 1 } } }),
  ]);

  const brands = brandRows.map((r) => r.brandName).filter((b): b is string => !!b).sort();
  const hasMore = visibleProducts.length < totalCount;

  const sponsoredSearchAds = filters.q
    ? (await SponsoredSlotService.getLiveSlots("SEARCH_TOP"))
        .filter((slot) => slot.product.name.toLowerCase().includes(filters.q!.toLowerCase()))
        .map((slot) => ({
          slotId: slot.id,
          productId: slot.product.id,
          name: slot.product.name,
          nameAr: slot.product.nameAr,
          slug: slot.product.slug,
          price: Number(slot.product.saveoPrice),
          imageUrl: slot.product.images[0]?.url ?? null,
        }))
    : [];

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="savo-products-page">
      <div className="savo-products-intro">
        <div className="savo-products-eyebrow">{isArabic ? "اكتشف · تسوق · احصل عليه" : "Discover · Shop · Get it"}</div>
        <div className="savo-products-heading-row">
          <h1>{filters.q ? t("resultsFor", { query: filters.q }) : isArabic ? "المنتجات" : "All Products"}</h1>
          <span className="savo-products-count">
            {totalCount === 0 ? (isArabic ? "٠ نتيجة" : "0 results") : `${totalCount} ${common("results")}`}
          </span>
        </div>
      </div>

      {filters.q && <div className="savo-products-shell"><SponsoredSearchAdsRail products={sponsoredSearchAds} locale={locale} /></div>}

      <Suspense fallback={null}>
        <ProductFilters
          categories={categories}
          brands={brands}
          activeCategory={filters.category}
          activeSort={filters.sort}
          selectedBrands={filters.brands}
          selectedDeals={filters.deals}
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          selectedAvailability={filters.availability}
          isArabic={isArabic}
        >
          {totalCount === 0 ? (
            <div className="savo-products-empty">
              <div className="savo-products-empty-icon">
                <DiscoveryPoint color="var(--savo-shell-muted)" width={28} height={28} />
              </div>
              <div className="savo-products-empty-title">{isArabic ? "لا توجد اكتشافات" : "No discoveries found"}</div>
              <div className="savo-products-empty-copy">
                {isArabic
                  ? "لا توجد منتجات تطابق فلاترك الحالية. حاول مسح بعض الفلاتر."
                  : "No products match your current filters. Try clearing some filters to discover more."}
              </div>
              <a href="?" className="savo-products-empty-cta">{isArabic ? "مسح الفلاتر" : "Clear all filters"}</a>
            </div>
          ) : (
            <>
              <ProductGrid products={serializeProducts(visibleProducts.map((pr) => ({ ...pr, has360Media: pr.media.length > 0 }))) as any} noResultsLabel={common("noResults")} continueShoppingLabel={common("continueShopping")} outOfStockLabel={common("outOfStock")} addToCartLabel={pT("addToCart")} locale={locale} />
              {hasMore && (
                <div className="savo-products-loadmore">
                  <div className="savo-products-loadmore-count">
                    {isArabic
                      ? `عرض ${visibleProducts.length} من ${totalCount} منتج`
                      : `Showing ${visibleProducts.length} of ${totalCount} products`}
                  </div>
                  <div className="savo-products-loadmore-bar">
                    <b style={{ width: `${(visibleProducts.length / totalCount) * 100}%` }} />
                  </div>
                  <a
                    href={`?${new URLSearchParams({ ...rawParams, page: String(filters.page + 1) } as Record<string, string>).toString()}`}
                    className="savo-products-loadmore-btn"
                  >
                    {isArabic ? "تحميل المزيد" : "Load more"}
                  </a>
                </div>
              )}
            </>
          )}
        </ProductFilters>
      </Suspense>
    </div>
  );
}
