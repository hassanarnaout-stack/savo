import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { brandNameToSlug } from "@/lib/brand-slug";
import { ProductGrid } from "@/components/product/product-grid";
import { serializeProducts } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export default async function BrandDistrictPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [locale, session] = await Promise.all([getLocale(), auth()]);
  const membersOnlyFilter = await MembershipService.getVisibilityFilter(session?.user?.id);

  const brandRows = await prisma.product.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED", brandName: { not: null } },
    select: { brandName: true },
    distinct: ["brandName"],
  });
  const matchedBrand = brandRows.find((r) => r.brandName && brandNameToSlug(r.brandName) === slug)?.brandName;
  if (!matchedBrand) notFound();

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED", ...membersOnlyFilter, brandName: matchedBrand },
    select: {
      id: true, name: true, nameAr: true, slug: true, originalPrice: true, saveoPrice: true, stockQty: true,
      type: true, dealEndsAt: true, images: { take: 1, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { orderCount: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="saveo-aura shadow-luxury relative mb-8 overflow-hidden rounded-xl2 bg-gradient-to-br from-black to-saveo-emerald-900 p-10 text-center text-white sm:p-16">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-saveo-gold-400" />
        <h1 className="text-3xl font-black sm:text-5xl">{matchedBrand}</h1>
        <p className="mt-3 text-sm text-white/60">{products.length} {locale === "ar" ? "منتج" : "products"}</p>
      </section>

      <ProductGrid products={serializeProducts(products) as any} />
    </div>
  );
}
