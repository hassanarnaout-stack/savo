import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MembershipService } from "@/lib/services/membership-service";

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

export type HomepageViewModel = {
  heroProducts: HomeProduct[]; flashDeals: HomeDeal[]; trending: HomeProduct[];
  editorsPicks: HomeProduct[];
  categories: { id: string; slug: string; name: string; nameAr: string | null; count: number; image: string | null }[];
  brands: { slug: string; name: string; count: number }[];
  mysteryBoxes: HomeProduct[]; justLanded: HomeProduct[]; bestValue: HomeProduct[];
  endingSoon: HomeDeal[]; verifiedSupplierCount: number;
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
  const [products, flashRows, editorRows, categories, verifiedSupplierCount] = await Promise.all([
    prisma.product.findMany({ where: publicWhere, include: productInclude }),
    prisma.flashDeal.findMany({
      where: { status: "LIVE", isActive: true, startAt: { lte: now }, endAt: { gt: now }, product: publicWhere },
      orderBy: { endAt: "asc" }, include: { product: { include: productInclude } },
    }),
    prisma.productBadge.findMany({
      where: { type: "EDITORS_PICK", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], product: publicWhere },
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
  ]);
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
  const mysteryBoxes = all.filter((p) => p.type === "MYSTERY_BOX").sort((a, b) => (b.mysteryValueMax ?? 0) - (a.mysteryValueMax ?? 0)).slice(0, 3);
  const justLanded = [...all].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 4);
  const bestValue = [...all].filter((p) => p.originalPrice > p.price).sort((a, b) => (b.originalPrice - b.price) - (a.originalPrice - a.price)).slice(0, 4);
  const endingSoon = deals.filter((deal) => Date.parse(deal.endsAt) - now.getTime() <= 6 * 60 * 60 * 1000).slice(0, 4);
  const heroProducts = [...trending, ...deals, ...justLanded].filter((p, i, list) => list.findIndex((q) => q.id === p.id) === i).slice(0, 3);
  const brandMap = new Map<string, { slug: string; name: string; count: number }>();
  for (const product of all) {
    if (!product.brand) continue;
    const current = brandMap.get(product.brand);
    if (current) current.count += 1;
    else brandMap.set(product.brand, { slug: slugify(product.brand), name: product.brand, count: 1 });
  }
  return {
    heroProducts, flashDeals: deals.slice(0, 4), trending, editorsPicks,
    categories: categories.filter((category) => category._count.products > 0).slice(0, 4).map((category) => ({
      id: category.id, slug: category.slug, name: category.name, nameAr: category.nameAr,
      count: category._count.products, image: category.imageUrl ?? category.products[0]?.images[0]?.url ?? null,
    })),
    brands: [...brandMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    mysteryBoxes, justLanded, bestValue, endingSoon, verifiedSupplierCount,
  };
}
