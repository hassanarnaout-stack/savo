import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { serializeProducts } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { CategorySortSelect } from "@/components/product/category-sort-select";
import { SponsoredProductsRail } from "@/components/product/sponsored-products-rail";
import { CategoryProductCard } from "@/components/product/category-product-card";

export const revalidate = 30;

/** Same real, bounded pagination pattern as /products — Category's V22
 * "Load more" is not fake: each click is a real take-bound query. */
const PAGE_SIZE = 12;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [category, locale] = await Promise.all([
    prisma.category.findUnique({ where: { slug }, select: { name: true, nameAr: true, descriptionAr: true, description: true } }),
    getLocale(),
  ]);
  if (!category) return { title: "Category not found" };

  const name = locale === "ar" && category.nameAr ? category.nameAr : category.name;
  const description = (locale === "ar" && category.descriptionAr ? category.descriptionAr : category.description) ?? `Shop ${name} on Savo — Kuwait's smart savings marketplace.`;

  return {
    title: name,
    description,
    alternates: { canonical: `/${locale}/category/${slug}` },
    openGraph: { title: name, description, type: "website" },
  };
}

/**
 * Ported from the latest V22 export (src/CustomerPages.tsx,
 * CategoryPage() + its inline ProductGrid()) — V22 source-exact this
 * pass: WorldHero, Best Sellers rail, category Mystery Boxes rail, and
 * Top Brands are REMOVED from this page's presentation (confirmed
 * NOT PRESENT in V22's actual CategoryPage()). Their underlying real
 * queries/services are untouched elsewhere (getWorldTheme, world-hero.tsx,
 * the brand groupBy pattern) — only this page stopped rendering them.
 * Breadcrumb and subcategory chips are real SAVO navigation features
 * V22's prototype doesn't have, kept and restyled per the migration
 * instructions rather than dropped.
 *
 * Product card: CategoryProductCard (new, Category-only — see its own
 * file header for why it's separate from the shared .savo-pc and
 * DiscoverRailCard). Grid: fixed 3/2 columns matching V22 exactly, not
 * the shared page's auto-fill grid. Load more: same real take-bound
 * pattern as /products, not the "load everything at once" this page
 * had before.
 */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort, page } = await searchParams;

  const [category, session, locale] = await Promise.all([
    prisma.category.findUnique({ where: { slug }, include: { children: true } }),
    auth(),
    getLocale(),
  ]);

  if (!category || !category.isActive) notFound();

  const isArabic = locale === "ar";
  const membersOnlyFilter = await MembershipService.getVisibilityFilter(session?.user?.id);

  const SORT_OPTIONS: Record<string, any> = {
    newest: { createdAt: "desc" },
    price_low: { saveoPrice: "asc" },
    price_high: { saveoPrice: "desc" },
    name: { name: "asc" },
  };
  const activeSort = sort && SORT_OPTIONS[sort] ? sort : "newest";
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const take = currentPage * PAGE_SIZE;

  const where = {
    status: "ACTIVE" as const,
    approvalStatus: "APPROVED" as const,
    ...membersOnlyFilter,
    OR: [{ categoryId: category.id }, { category: { parentId: category.id } }],
  };

  const [totalCount, visibleProducts] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: SORT_OPTIONS[activeSort],
      take,
      include: {
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        media: { where: { type: "IMAGE_360" }, select: { id: true }, take: 1 },
        badges: { take: 1, select: { type: true } },
      },
    }),
  ]);

  const categoryName = isArabic && category.nameAr ? category.nameAr : category.name;
  const categoryDescription = isArabic && category.descriptionAr ? category.descriptionAr : category.description;
  const hasMore = visibleProducts.length < totalCount;

  return (
    <div className="savo-category-page">
      <nav className="savo-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">{isArabic ? "الرئيسية" : "Home"}</Link>
        <span>/</span>
        <Link href="/products">{isArabic ? "المنتجات" : "Products"}</Link>
        <span>/</span>
        <span>{categoryName}</span>
      </nav>

      <div className="savo-category-hero">
        <div className="savo-category-hero-copy">
          <div className="savo-products-eyebrow">{isArabic ? "الفئة" : "Category"}</div>
          <h1>{categoryName}</h1>
          {categoryDescription && <p>{categoryDescription}</p>}
        </div>
        <div className="savo-category-hero-count">
          <div>{totalCount}</div>
          <span>{isArabic ? "منتج" : "discoveries"}</span>
        </div>
      </div>

      <div className="savo-category-shell">
        <div className="savo-category-toolbar">
          <span className="savo-products-count">
            {totalCount} {isArabic ? "منتج" : totalCount === 1 ? "product" : "products"}
          </span>
          <CategorySortSelect />
        </div>

        <SponsoredProductsRail placementType="CATEGORY_TOP" locale={locale} />

        {category.children.length > 0 && (
          <div className="savo-category-subchips">
            {category.children.map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className="savo-products-catpill">
                {isArabic && c.nameAr ? c.nameAr : c.name}
              </Link>
            ))}
          </div>
        )}

        {totalCount === 0 ? (
          <div className="savo-category-empty">
            <div className="savo-category-empty-icon">⬡</div>
            <div className="savo-category-empty-title">{isArabic ? "لا اكتشافات هنا" : "Nothing here yet"}</div>
            <div className="savo-category-empty-sub">
              {isArabic ? "لا توجد منتجات في هذه الفئة حالياً. تصفح فئات أخرى." : "No products in this category right now. Try browsing other categories."}
            </div>
            <Link href="/products" className="savo-category-empty-cta">{isArabic ? "استكشف الكل" : "Explore all"}</Link>
          </div>
        ) : (
          <>
            <div className="savo-category-grid">
              {serializeProducts(visibleProducts.map((p) => ({ ...p, has360Media: p.media.length > 0, badgeType: p.badges[0]?.type ?? null }))).map((product: any) => (
                <CategoryProductCard key={product.id} product={product} />
              ))}
            </div>
            {hasMore && (
              <div className="savo-products-loadmore">
                <div className="savo-products-loadmore-count">
                  {isArabic ? `عرض ${visibleProducts.length} من ${totalCount}` : `Showing ${visibleProducts.length} of ${totalCount}`}
                </div>
                <div className="savo-products-loadmore-bar">
                  <b style={{ width: `${(visibleProducts.length / totalCount) * 100}%` }} />
                </div>
                <Link
                  href={{ pathname: `/category/${slug}`, query: { ...(sort ? { sort } : {}), page: String(currentPage + 1) } }}
                  className="savo-products-loadmore-btn"
                >
                  {isArabic ? "تحميل المزيد" : "Load more"}
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
