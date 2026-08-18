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
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { parseProductFilters, buildProductWhere, buildProductOrderBy, type ProductFilterParams } from "@/lib/product-filters";
import { redirect } from "next/navigation";

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

  // Mystery Boxes is NOT a normal shoppable category — the approved
  // 2026 experience (Collection → Build → Locked) is the ONLY customer
  // Mystery Box flow. Redirect immediately, before any query/filter
  // rendering, whenever this route is reached via ?category=mystery-boxes
  // (e.g. the category chip inside this same page).
  if (rawParams.category === "mystery-boxes") {
    redirect(`/${locale}/mystery-boxes`);
  }

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

  /** Flash Deals / Ending Soon — real FlashDeal-backed modes. Reuses
   * FlashDealService.getAllLiveDeals() as-is (same LIVE/sold-out/time-
   * window rules governing the PDP countdown). Mapped into the same
   * ProductCardData shape ProductGrid already expects. */
  let flashProducts: any[] | null = null;
  if (filters.flashFilter) {
    const deals = await FlashDealService.getAllLiveDeals(100);
    const sorted = filters.flashFilter === "ending_soon" ? [...deals].sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime()) : deals;
    flashProducts = sorted.map((deal) => ({
      id: deal.product.id,
      name: deal.product.name,
      nameAr: deal.product.nameAr,
      slug: deal.product.slug,
      originalPrice: deal.product.saveoPrice,
      saveoPrice: FlashDealService.effectivePrice(Number(deal.product.saveoPrice), deal.discountPercent),
      stockQty: FlashDealService.getRemainingStock(deal),
      type: "DEAL",
      dealEndsAt: deal.endAt,
      images: deal.product.images,
      has360Media: false,
    }));
  }

  const [categories, brandRows, totalCount, visibleProducts] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({ where: { status: "ACTIVE", approvalStatus: "APPROVED" }, select: { brandName: true }, distinct: ["brandName"] }),
    flashProducts ? Promise.resolve(flashProducts.length) : prisma.product.count({ where }),
    flashProducts ? Promise.resolve(flashProducts) : prisma.product.findMany({ where, orderBy, take, include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, media: { where: { type: "IMAGE_360" }, select: { id: true }, take: 1 } } }),
  ]);

  const brands = brandRows.map((r) => r.brandName).filter((b): b is string => !!b).sort();
  const hasMore = !flashProducts && visibleProducts.length < totalCount;

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
          <h1>{filters.q ? t("resultsFor", { query: filters.q }) : filters.flashFilter === "flash" ? (isArabic ? "عروض فلاش" : "Flash Deals") : filters.flashFilter === "ending_soon" ? (isArabic ? "تنتهي قريبًا" : "Ending Soon") : isArabic ? "المنتجات" : "All Products"}</h1>
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
              <ProductGrid products={serializeProducts(flashProducts ? visibleProducts : (visibleProducts as any[]).map((pr: any) => ({ ...pr, has360Media: pr.media.length > 0 }))) as any} noResultsLabel={common("noResults")} continueShoppingLabel={common("continueShopping")} outOfStockLabel={common("outOfStock")} addToCartLabel={pT("addToCart")} locale={locale} />
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
