import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { ProductGrid } from "@/components/product/product-grid";
import { serializeProducts } from "@/lib/utils";

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [locale, session] = await Promise.all([getLocale(), auth()]);
  const membersOnlyFilter = await MembershipService.getVisibilityFilter(session?.user?.id);

  const collection = await prisma.collection.findUnique({
    where: { slug, isActive: true },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } },
        },
      },
    },
  });
  if (!collection) notFound();

  // Prisma doesn't support `where` inside `include` for a to-one relation
  // (product here is one-per-CollectionProduct, not a list) — filtered in
  // JS instead. getVisibilityFilter returns {} for an active member or
  // { isMembersOnly: false } for a non-member — not an object with a
  // directly-checkable flag, so membership is derived from whether the
  // filter object has any keys at all.
  const isMember = Object.keys(membersOnlyFilter).length === 0;
  const products = collection.products
    .map((cp) => cp.product)
    .filter((p) => p.status === "ACTIVE" && p.approvalStatus === "APPROVED" && (isMember || !p.isMembersOnly));

  const name = locale === "ar" && collection.nameAr ? collection.nameAr : collection.name;
  const description = locale === "ar" && collection.descriptionAr ? collection.descriptionAr : collection.description;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-saveo-emerald-700">{name}</h1>
        {description && <p className="mx-auto mt-2 max-w-xl text-sm text-saveo-emerald-700/50">{description}</p>}
      </div>
      <ProductGrid products={serializeProducts(products) as any} />
    </div>
  );
}
