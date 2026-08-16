import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { ProductGrid } from "@/components/product/product-grid";
import { notFound } from "next/navigation";
import { serializeProducts } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { CategorySortSelect } from "@/components/product/category-sort-select";
import { SponsoredProductsRail } from "@/components/product/sponsored-products-rail";
import { getWorldTheme } from "@/lib/world-themes";
import { WorldHero } from "@/components/product/world-hero";
import { ProductRail } from "@/components/product/product-grid";
import { brandNameToSlug } from "@/lib/brand-slug";

export const revalidate = 30;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
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
 * CategoryPage()) — dark hero band, toolbar, product grid. V22's
 * source is a simplified demo (no World theming, subcategories,
 * best-seller/mystery-box rails, or sponsored placements); those are
 * all real production features and are preserved exactly, just
 * re-skinned to the same dark tokens as the hero band around them.
 * `Breadcrumb` no longer imported from @/components/admin/breadcrumb
 * (a shared ADMIN component) — replaced with a small local V22-styled
 * breadcrumb so the admin component stays untouched.
 */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort } = await searchParams;

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
  const worldTheme = getWorldTheme(slug);

  // Discovery Worlds (Design Language v1, batch 3) — the main product query
  // and the World-specific queries are independent of each other (neither
  // depends on the other's result), so they run in a single parallel batch
  // rather than two sequential round-trips.
  const [products, bestSellers, mysteryBoxesInCategory, worldBrands] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE", approvalStatus: "APPROVED",
        ...membersOnlyFilter,
        OR: [
          { categoryId: category.id },
          { category: { parentId: category.id } }, // include subcategory products
        ],
      },
      orderBy: SORT_OPTIONS[activeSort],
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, media: { where: { type: "IMAGE_360" }, select: { id: true }, take: 1 } },
    }),
    worldTheme
      ? prisma.product.findMany({
          where: { status: "ACTIVE", approvalStatus: "APPROVED", ...membersOnlyFilter, categoryId: category.id, orderCount: { gt: 0 } },
          orderBy: { orderCount: "desc" },
          take: 10,
          include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
        })
      : Promise.resolve([]),
    worldTheme
      ? prisma.product.findMany({
          where: { status: "ACTIVE", approvalStatus: "APPROVED", categoryId: category.id, type: "MYSTERY_BOX" },
          take: 10,
          include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
        })
      : Promise.resolve([]),
    worldTheme
      ? prisma.product.groupBy({
          by: ["brandName"],
          where: { status: "ACTIVE", approvalStatus: "APPROVED", categoryId: category.id, brandName: { not: null } },
          _count: true,
          orderBy: { _count: { brandName: "desc" } },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  const categoryName = isArabic && category.nameAr ? category.nameAr : category.name;
  const categoryDescription = isArabic && category.descriptionAr ? category.descriptionAr : category.description;

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
          <div>{products.length}</div>
          <span>{isArabic ? "منتج" : "discoveries"}</span>
        </div>
      </div>

      {worldTheme && (
        <div className="savo-category-shell">
          <WorldHero theme={worldTheme} categoryName={category.name} categoryNameAr={category.nameAr} locale={locale} productCount={products.length} />
        </div>
      )}

      {worldTheme && bestSellers.length > 0 && (
        <ProductRail title={isArabic ? "⭐ الأكثر مبيعاً" : "⭐ Best Sellers"} products={serializeProducts(bestSellers) as any} />
      )}

      {worldTheme && category.slug !== "mystery-boxes" && mysteryBoxesInCategory.length > 0 && (
        <ProductRail title={isArabic ? "🎁 صناديق مفاجآت" : "🎁 Mystery Boxes"} products={serializeProducts(mysteryBoxesInCategory) as any} />
      )}

      {worldTheme && worldBrands.length > 0 && (
        <section className="savo-category-shell savo-category-top-brands">
          <div className="savo-brands-section-label">{isArabic ? "🏆 أفضل الماركات" : "🏆 Top Brands"}</div>
          <div className="savo-brands-grid">
            {worldBrands.map((b) => b.brandName && (
              <Link key={b.brandName} href={`/brands/${brandNameToSlug(b.brandName)}`} className="savo-brands-row">
                <span className="savo-brands-row-avatar">{b.brandName[0]}</span>
                <span className="savo-brands-row-name">{b.brandName} · {b._count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="savo-category-shell">
        <div className="savo-category-toolbar">
          <span className="savo-products-count">
            {products.length} {isArabic ? "منتج" : products.length === 1 ? "product" : "products"}
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

        <ProductGrid products={serializeProducts(products.map((pr) => ({ ...pr, has360Media: pr.media.length > 0 }))) as any} />
      </div>
    </div>
  );
}
