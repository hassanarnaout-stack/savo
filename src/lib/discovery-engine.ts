import { prisma } from "@/lib/prisma";

/**
 * Discovery Engine — Phase 4.1
 *
 * Each function here is deliberately independent and self-contained: the
 * homepage composes them, but any one of them can be reused elsewhere
 * (category pages, admin previews, a future "Discover" tab) or replaced
 * without touching the others. None of them accept a client-supplied
 * filter that could leak another user's/supplier's data — they only ever
 * read PUBLIC, ACTIVE catalog data.
 */

const productCard = {
  id: true,
  name: true,
  nameAr: true,
  slug: true,
  originalPrice: true,
  saveoPrice: true,
  discountPct: true,
  stockQty: true,
  type: true,
  dealEndsAt: true,
  images: { take: 1, orderBy: { sortOrder: "asc" as const } },
};

/** Newest products added to the catalog — the "what's new today" hook. */
export async function getNewArrivals(take = 8) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take,
    select: productCard,
  });
}

/** Best-selling products by historical order volume. */
export async function getTrending(take = 8) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED", orderCount: { gt: 0 } },
    orderBy: { orderCount: "desc" },
    take,
    select: productCard,
  });
}

/** Products currently running a time-limited deal (type=DEAL, still active). */
export async function getLimitedDeals(take = 8) {
  return prisma.product.findMany({
    where: {
      status: "ACTIVE", approvalStatus: "APPROVED",
      type: "DEAL",
      OR: [{ dealEndsAt: null }, { dealEndsAt: { gt: new Date() } }],
    },
    orderBy: { dealEndsAt: "asc" },
    take,
    select: productCard,
  });
}

/** The single active rotating spotlight slot, with its product + supplier. */
export async function getDealOfTheHour() {
  return prisma.dealOfTheHour.findFirst({
    where: { isActive: true, endTime: { gt: new Date() } },
    orderBy: { startTime: "desc" },
    include: {
      product: {
        include: {
          images: { take: 1, orderBy: { sortOrder: "asc" } },
          supplier: { select: { companyName: true, companyNameAr: true, verificationStatus: true, commissionRate: true } },
        },
      },
    },
  });
}

/** Mystery boxes grouped by tier — Bronze / Silver / Gold. */
/**
 * SAVO Rescue homepage rail — real near-expiry products only.
 * Ranked by soonest expiry first (most urgent to move), matching the
 * "Expires in X days" real-data promise. Products without a valid
 * expiryDate are still eligible (RESCUE just means steep-discount
 * verified-safe surplus, not every row needs an expiry to display),
 * but the "Expires in X" line itself is only shown when expiryDate is
 * actually set — never fabricated.
 */
export async function getRescueProducts(take = 6) {
  return prisma.product.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED", type: "RESCUE" },
    orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take,
    select: { ...productCard, expiryDate: true, brandName: true },
  });
}

export async function getMysteryBoxesByTier() {
  const boxes = await prisma.product.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED", type: "MYSTERY_BOX" },
    orderBy: { saveoPrice: "asc" },
    select: {
      ...productCard,
      mysteryBoxTier: true,
      mysteryBoxValueMin: true,
      mysteryBoxValueMax: true,
      mysteryBoxReveal: true,
      mysteryBoxRevealAr: true,
    },
  });

  return {
    bronze: boxes.filter((b) => b.mysteryBoxTier === "BRONZE"),
    silver: boxes.filter((b) => b.mysteryBoxTier === "SILVER"),
    gold: boxes.filter((b) => b.mysteryBoxTier === "GOLD"),
    untiered: boxes.filter((b) => !b.mysteryBoxTier),
  };
}

/** Top suppliers by product count + sales volume — "Featured Suppliers". */
export async function getFeaturedSuppliers(take = 6, categoryId?: string) {
  const suppliers = await prisma.supplier.findMany({
    where: { status: "ACTIVE", verificationStatus: "VERIFIED" },
    select: {
      id: true,
      slug: true,
      companyName: true,
      companyNameAr: true,
      logo: true,
      _count: { select: { products: { where: categoryId ? { categoryId } : undefined } } },
      products: { select: { orderCount: true }, where: { status: "ACTIVE", approvalStatus: "APPROVED", ...(categoryId ? { categoryId } : {}) } },
    },
  });

  return suppliers
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      companyName: s.companyName,
      companyNameAr: s.companyNameAr,
      logo: s.logo,
      isVerified: true, // real — this function's where clause already filters to verificationStatus: "VERIFIED" only
      productCount: s._count.products,
      totalOrders: s.products.reduce((sum, p) => sum + p.orderCount, 0),
      // Rating isn't implemented yet — see Review model. Returning null keeps
      // the UI contract stable so a real rating can slot in later without
      // any component changes.
      rating: null as number | null,
    }))
    .filter((s) => s.productCount > 0)
    .sort((a, b) => b.totalOrders - a.totalOrders || b.productCount - a.productCount)
    .slice(0, take);
}

/** "Recommended for you" — see recommendation-engine.ts for the swappable strategy behind this. */
export { getRecommendedForUser } from "@/lib/recommendation-engine";
