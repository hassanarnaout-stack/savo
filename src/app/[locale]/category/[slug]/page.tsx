import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { ProductGrid } from "@/components/product/product-grid";
import { notFound } from "next/navigation";
import { serializeProducts } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Breadcrumb } from "@/components/admin/breadcrumb";
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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sort } = await searchParams;

  const [category, session, locale] = await Promise.all([
    prisma.category.findUnique({ where: { slug }, include: { children: true } }),
    auth(),
    getLocale(),
  ]);

  if (!category || !category.isActive) notFound();

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
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: "Home", href: `/${locale}` },
          { label: "Products", href: `/${locale}/products` },
          { label: category.name },
        ]}
      />

      {worldTheme && (
        <div className="mb-8">
          <WorldHero theme={worldTheme} categoryName={category.name} categoryNameAr={category.nameAr} locale={locale} productCount={products.length} />
        </div>
      )}

      {worldTheme && bestSellers.length > 0 && (
        <ProductRail title={locale === "ar" ? "⭐ الأكثر مبيعاً" : "⭐ Best Sellers"} products={serializeProducts(bestSellers) as any} />
      )}

      {worldTheme && category.slug !== "mystery-boxes" && mysteryBoxesInCategory.length > 0 && (
        <ProductRail title={locale === "ar" ? "🎁 صناديق مفاجآت" : "🎁 Mystery Boxes"} products={serializeProducts(mysteryBoxesInCategory) as any} />
      )}

      {worldTheme && worldBrands.length > 0 && (
        <section className="py-6">
          <h2 className="mb-4 text-lg font-bold text-saveo-emerald-700">{locale === "ar" ? "🏆 أفضل الماركات" : "🏆 Top Brands"}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {worldBrands.map((b) => b.brandName && (
              <Link
                key={b.brandName}
                href={`/brands/${brandNameToSlug(b.brandName)}`}
                className="card-float shadow-luxury flex flex-col items-center gap-1.5 rounded-xl2 bg-white p-4 text-center"
              >
                <p className="text-sm font-bold text-saveo-emerald-700">{b.brandName}</p>
                <p className="text-xs text-saveo-emerald-700/50">{b._count} {locale === "ar" ? "منتج" : "products"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{category.icon ?? "🛍️"}</span>
          <div>
            <h1 className="text-2xl font-bold">
              {category.name} <span className="text-base font-normal text-saveo-emerald-700/40">({products.length})</span>
            </h1>
            {category.description && (
              <p className="text-sm text-saveo-emerald-700/50">{category.description}</p>
            )}
          </div>
        </div>
        <CategorySortSelect />
      </div>

      <SponsoredProductsRail placementType="CATEGORY_TOP" locale={locale} />

      {category.children.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {category.children.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="rounded-full bg-saveo-emerald-700/5 px-3.5 py-1.5 text-xs font-semibold"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <ProductGrid products={serializeProducts(products) as any} />
    </div>
  );
}
