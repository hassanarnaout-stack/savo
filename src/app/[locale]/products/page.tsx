import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/product-grid";
import { CategoryFilterBar } from "@/components/product/category-filter-bar";
import { serializeProducts } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { SponsoredSlotService } from "@/lib/services/sponsored-slot-service";
import { SponsoredSearchAdsRail } from "@/components/product/sponsored-search-ads-rail";

export const revalidate = 30;

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; sort?: string; badge?: string; membersOnly?: string; type?: string }>;
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q, category, sort, badge, membersOnly, type } = await searchParams;
  const [t, common, session] = await Promise.all([
    getTranslations("productsPage"),
    getTranslations("common"),
    auth(),
  ]);
  const membersOnlyFilter = await MembershipService.getVisibilityFilter(session?.user?.id);

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, parentId: null }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: {
        status: "ACTIVE", approvalStatus: "APPROVED",
        ...membersOnlyFilter,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(category ? { category: { slug: category } } : {}),
        ...(badge ? { badges: { some: { type: badge as any } } } : {}),
        ...(membersOnly === "true" ? { isMembersOnly: true } : {}),
        ...(type ? { type: type as any } : {}),
      },
      orderBy:
        sort === "price_asc"
          ? { saveoPrice: "asc" }
          : sort === "price_desc"
          ? { saveoPrice: "desc" }
          : sort === "discount"
          ? { discountPct: "desc" }
          : { createdAt: "desc" },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const sponsoredSearchAds = q
    ? (await SponsoredSlotService.getLiveSlots("SEARCH_TOP"))
        .filter((slot) => slot.product.name.toLowerCase().includes(q.toLowerCase()))
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">{q ? t("resultsFor", { query: q }) : t("title")}</h1>
      <p className="mb-6 text-sm text-saveo-emerald-700/50">
        {products.length} {common("results")}
      </p>

      {q && <SponsoredSearchAdsRail products={sponsoredSearchAds} locale={locale} />}

      <Suspense fallback={null}>
        <CategoryFilterBar categories={categories} activeCategory={category} activeSort={sort} />
      </Suspense>

      <div className="mt-6">
        <ProductGrid products={serializeProducts(products) as any} />
      </div>
    </div>
  );
}
