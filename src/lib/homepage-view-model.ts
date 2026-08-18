import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MembershipService } from "@/lib/services/membership-service";
import { getDealOfTheHour } from "@/lib/discovery-engine";
import { isLaunchFeatureEnabled } from "@/lib/launch-flags";
import { HomepageSettingsService } from "@/lib/services/homepage-settings-service";

export type HomeProduct = {
  id: string; slug: string; name: string; nameAr: string | null; brand: string | null;
  category: string; image: string | null; originalPrice: number; price: number;
  stock: number; orderCount: number; viewCount: number;
  type: "STANDARD" | "DEAL" | "MYSTERY_BOX" | "RESCUE";
  createdAt: string; expiryDate: string | null;
  mysteryTier: "BRONZE" | "SILVER" | "GOLD" | null;
  mysteryValueMin: number | null; mysteryValueMax: number | null;
};

export type HomeDeal = HomeProduct & {
  dealId: string; flashDiscountPercent: number; flashPrice: number;
  stockLimit: number; soldCount: number; endsAt: string;
};

/**
 * SAVO Hour (Phase 3 — V22 Homepage Migration). Backed by the real
 * DealOfTheHour model — this used to be displayed on an earlier
 * Homepage iteration (see discovery-engine.ts) but was dropped during
 * the V21 migration and never reconnected. `buyersCount` is a real
 * incrementing counter (not fabricated social proof) — see the
 * DealOfTheHour schema comment. Gated by ADVANCED_DEAL_OF_HOUR_ENABLED;
 * null means either the flag is off or no slot is currently active.
 */
export type HomeDealOfHour = {
  id: string; productId: string; slug: string; name: string; nameAr: string | null;
  image: string | null; supplierName: string | null; supplierNameAr: string | null;
  price: number; originalPrice: number; discountPercent: number;
  stockLimit: number; buyersCount: number; endsAt: string;
  /** Real per-session state — same Favorite table product-card.tsx reads, so the "Save for later" heart starts in the correct state instead of always defaulting to unfavorited. */
  isFavorited: boolean;
};

export type HomepageViewModel = {
  heroProducts: HomeProduct[]; flashDeals: HomeDeal[]; trending: HomeProduct[];
  editorsPicks: HomeProduct[];
  hubTrending: HomeProduct[]; hubBestSellers: HomeProduct[]; hubEditorsPicks: HomeProduct[];
  insideTheBrand: { id: string | null; name: string; nameAr: string | null; slug: string; logoUrl: string | null; coverImageUrl: string | null; productCount: number; isLinked: boolean }[];
  categories: { id: string; slug: string; name: string; nameAr: string | null; count: number; image: string | null }[];
  brands: { slug: string; name: string; count: number }[];
  mysteryBoxes: HomeProduct[]; justLanded: HomeProduct[]; bestValue: HomeProduct[];
  endingSoon: HomeDeal[]; verifiedSupplierCount: number;
  dealOfTheHour: HomeDealOfHour | null;
  /** Real live product count — used for Hero stats instead of hard-coded marketing numbers. */
  totalProductCount: number;
};

const productInclude = {
  category: { select: { name: true } },
  images: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { url: true } },
} as const;

function toProduct(product: any): HomeProduct {
  return {
    id: product.id, slug: product.slug, name: product.name, nameAr: product.nameAr,
    brand: product.brandName, category: product.category.name,
    image: product.images[0]?.url ?? null,
    originalPrice: Number(product.originalPrice), price: Number(product.saveoPrice),
    stock: Math.max(0, product.stockQty - product.reservedStock),
    orderCount: product.orderCount, viewCount: product.viewCount, type: product.type,
    createdAt: product.createdAt.toISOString(), expiryDate: product.expiryDate?.toISOString() ?? null,
    mysteryTier: product.mysteryBoxTier,
    mysteryValueMin: product.mysteryBoxValueMin == null ? null : Number(product.mysteryBoxValueMin),
    mysteryValueMax: product.mysteryBoxValueMax == null ? null : Number(product.mysteryBoxValueMax),
  };
}

const slugify = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function getHomepageViewModel(): Promise<HomepageViewModel> {
  const session = await auth();
  const visibility = await MembershipService.getVisibilityFilter(session?.user?.id);
  const now = new Date();
  const publicWhere = { status: "ACTIVE" as const, approvalStatus: "APPROVED" as const, ...visibility };
  const [products, flashRows, editorRows, bestSellerRows, categories, verifiedSupplierCount, dealOfHourEnabled, homepageSettings, catalogBrandRows] = await Promise.all([
    prisma.product.findMany({ where: publicWhere, include: productInclude }),
    prisma.flashDeal.findMany({
      where: { status: "LIVE", isActive: true, startAt: { lte: now }, endAt: { gt: now }, product: publicWhere },
      orderBy: { endAt: "asc" }, include: { product: { include: productInclude } },
    }),
    prisma.productBadge.findMany({
      where: { type: "EDITORS_PICK", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], product: publicWhere },
      orderBy: { assignedAt: "desc" }, include: { product: { include: productInclude } },
    }),
    // Real, automated — BadgeEngine assigns BEST_SELLER to the top 5th
    // percentile by real orderCount (see badge-engine.ts). A genuinely
    // distinct signal from raw Trending (live orderCount ranking).
    prisma.productBadge.findMany({
      where: { type: "BEST_SELLER", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], product: publicWhere },
      orderBy: { assignedAt: "desc" }, include: { product: { include: productInclude } },
    }),
    prisma.category.findMany({
      where: { isActive: true }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      include: {
        products: { where: publicWhere, orderBy: [{ orderCount: "desc" }, { createdAt: "desc" }], take: 1, include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } },
        _count: { select: { products: { where: publicWhere } } },
      },
    }),
    prisma.supplier.count({ where: { status: "ACTIVE", verificationStatus: "VERIFIED" } }),
    isLaunchFeatureEnabled("ADVANCED_DEAL_OF_HOUR_ENABLED"),
    HomepageSettingsService.get(),
    // "Inside the Brand" — canonical Brand records ONLY, never
    // reconstructed from Product.brandName when a real linked Brand
    // exists. Real product count comes from the brandId relation
    // (products actually linked, not a name-matched guess).
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      select: {
        id: true, name: true, nameAr: true, slug: true, logoUrl: true, coverImageUrl: true,
        _count: { select: { products: { where: { status: "ACTIVE", approvalStatus: "APPROVED" } } } },
      },
    }),
  ]);
  // SAVO Hour — only queried when the launch flag is on; getDealOfTheHour()
  // already filters to the single active, non-expired slot.
  const dealOfHourRow = dealOfHourEnabled ? await getDealOfTheHour() : null;
  const dealOfHourFavorited = dealOfHourRow && session?.user?.id
    ? await prisma.favorite.findUnique({ where: { userId_productId: { userId: session.user.id, productId: dealOfHourRow.productId } } })
    : null;
  const dealOfTheHour: HomeDealOfHour | null = (() => {
    if (!dealOfHourRow) return null;
    const p = dealOfHourRow.product;
    if (Math.max(0, p.stockQty - p.reservedStock) < 1) return null; // sold out slot, don't advertise it
    const originalPrice = Number(p.originalPrice);
    const basePrice = Number(p.saveoPrice);
    const discountPercent = dealOfHourRow.discountOverride ?? Math.max(0, Math.round((1 - basePrice / originalPrice) * 100));
    const price = dealOfHourRow.discountOverride != null
      ? Math.max(0, originalPrice * (1 - dealOfHourRow.discountOverride / 100))
      : basePrice;
    return {
      id: dealOfHourRow.id, productId: p.id, slug: p.slug, name: p.name, nameAr: p.nameAr,
      image: p.images[0]?.url ?? null,
      supplierName: p.supplier?.companyName ?? null, supplierNameAr: p.supplier?.companyNameAr ?? null,
      price, originalPrice, discountPercent,
      stockLimit: dealOfHourRow.stockLimit, buyersCount: dealOfHourRow.buyersCount,
      endsAt: dealOfHourRow.endTime.toISOString(),
      isFavorited: !!dealOfHourFavorited,
    };
  })();
  const all = products.map(toProduct).filter((product) => product.stock > 0 && product.image);
  const byId = new Map(all.map((product) => [product.id, product]));
  const deals = flashRows.filter((row) => row.soldCount < row.stockLimit).map((row) => {
    const product = byId.get(row.productId) ?? toProduct(row.product);
    return { ...product, dealId: row.id, flashDiscountPercent: row.discountPercent,
      flashPrice: Math.max(0, product.price * (1 - row.discountPercent / 100)),
      stockLimit: row.stockLimit, soldCount: row.soldCount, endsAt: row.endAt.toISOString() };
  });
  const trending = [...all].filter((p) => p.orderCount > 0).sort((a, b) => b.orderCount - a.orderCount || b.viewCount - a.viewCount).slice(0, 4);
  const editorsPicks = editorRows.map((row) => byId.get(row.productId) ?? toProduct(row.product)).filter((p) => p.stock > 0).slice(0, 3);
  // Discovery Hub — dedicated, slightly larger real slices (up to 7,
  // matching the V22 grid) kept separate from `trending`/`editorsPicks`
  // above so Hero's rotation count is never affected by this section.
  const hubTrending = [...all].filter((p) => p.orderCount > 0).sort((a, b) => b.orderCount - a.orderCount || b.viewCount - a.viewCount).slice(0, 7);
  const hubBestSellers = bestSellerRows.map((row) => byId.get(row.productId) ?? toProduct(row.product)).filter((p) => p.stock > 0).slice(0, 7);
  const hubEditorsPicks = editorRows.map((row) => byId.get(row.productId) ?? toProduct(row.product)).filter((p) => p.stock > 0).slice(0, 7);
  const mysteryBoxes = all.filter((p) => p.type === "MYSTERY_BOX").sort((a, b) => (b.mysteryValueMax ?? 0) - (a.mysteryValueMax ?? 0)).slice(0, 3);
  const justLanded = [...all].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 4);
  const bestValue = [...all].filter((p) => p.originalPrice > p.price).sort((a, b) => (b.originalPrice - b.price) - (a.originalPrice - a.price)).slice(0, 4);
  const endingSoon = deals.filter((deal) => Date.parse(deal.endsAt) - now.getTime() <= 6 * 60 * 60 * 1000).slice(0, 4);
  const heroProducts = [...trending, ...deals, ...justLanded].filter((p, i, list) => list.findIndex((q) => q.id === p.id) === i).slice(0, homepageSettings.heroProductCount);
  const brandMap = new Map<string, { slug: string; name: string; count: number }>();
  for (const product of all) {
    if (!product.brand) continue;
    const current = brandMap.get(product.brand);
    if (current) current.count += 1;
    else brandMap.set(product.brand, { slug: slugify(product.brand), name: product.brand, count: 1 });
  }

  // "Inside the Brand" final list — canonical Brand records (with a
  // REAL linked product count) first, sorted by that real count. Only
  // if fewer than 6 canonical brands have products does this fall
  // back to filling remaining slots from legacy brandName-only groups
  // (products with a brandName but no linked Brand row yet) — exactly
  // the "historical fallback only where no linked Brand exists" rule.
  const linkedBrandNames = new Set(catalogBrandRows.map((b) => b.name.toLowerCase()));
  const canonicalBrands = catalogBrandRows
    .filter((b) => b._count.products > 0)
    .sort((a, b) => b._count.products - a._count.products)
    .map((b) => ({ id: b.id, name: b.name, nameAr: b.nameAr, slug: b.slug, logoUrl: b.logoUrl, coverImageUrl: b.coverImageUrl, productCount: b._count.products, isLinked: true as const }));
  const legacyOnlyBrands = [...brandMap.values()]
    .filter((b) => !linkedBrandNames.has(b.name.toLowerCase()))
    .sort((a, b) => b.count - a.count)
    .map((b) => ({ id: null, name: b.name, nameAr: null, slug: b.slug, logoUrl: null, coverImageUrl: null, productCount: b.count, isLinked: false as const }));
  const insideTheBrand = [...canonicalBrands, ...legacyOnlyBrands].slice(0, 6);

  return {
    heroProducts, flashDeals: deals.slice(0, 4), trending, editorsPicks,
    hubTrending, hubBestSellers, hubEditorsPicks,
    insideTheBrand,
    categories: categories.filter((category) => category._count.products > 0).slice(0, 6).map((category) => ({
      id: category.id, slug: category.slug, name: category.name, nameAr: category.nameAr,
      count: category._count.products, image: category.imageUrl ?? category.products[0]?.images[0]?.url ?? null,
    })),
    brands: [...brandMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    mysteryBoxes, justLanded, bestValue, endingSoon, verifiedSupplierCount,
    dealOfTheHour, totalProductCount: all.length,
  };
}
