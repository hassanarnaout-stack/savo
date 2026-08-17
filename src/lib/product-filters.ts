import type { Prisma } from "@prisma/client";

/**
 * Typed query-param contract for /products.
 *
 * Every filter is a plain URL search param — shareable, bookmarkable,
 * back/forward-safe. This is the single source of truth for parsing
 * those params into a Prisma where/orderBy — the page and the filter
 * UI both import from here so there is exactly one filter system
 * (desktop and mobile render different controls, but they write and
 * read the same params).
 *
 * | param        | values                                          |
 * |--------------|--------------------------------------------------|
 * | q            | search text (existing)                          |
 * | category     | category slug (existing)                        |
 * | brand        | comma-separated brandName values                |
 * | minPrice     | number — saveoPrice >=                          |
 * | maxPrice     | number — saveoPrice <=                          |
 * | deal         | comma-separated: savo | discount20 | rescue     |
 * | filter       | flash | ending_soon — real FlashDeal-backed modes,
 *                  handled outside buildProductWhere (see page.tsx)   |
 * | availability | in_stock | low_stock                             |
 * | sort         | newest | price_asc | price_desc | discount | popular |
 * | page         | 1-based page number (existing pattern extended)  |
 */
export type SortKey = "newest" | "price_asc" | "price_desc" | "discount" | "popular";
export const SORT_KEYS: SortKey[] = ["newest", "price_asc", "price_desc", "discount", "popular"];

export type FlashFilterKey = "flash" | "ending_soon";
const FLASH_FILTER_KEYS: FlashFilterKey[] = ["flash", "ending_soon"];

export type DealKey = "savo" | "discount20" | "rescue";
export type AvailabilityKey = "in_stock" | "low_stock";

/**
 * Availability threshold — matches the ALREADY-canonical definition
 * used by ProductCard/ProductCardData (product-card.tsx): outOfStock
 * is `stockQty <= 0`, lowStock is `stockQty <= 5`. `reservedStock` is
 * not part of that definition, so it isn't used here either — this
 * keeps the listing filter and the card badge it produces in sync.
 */
export const LOW_STOCK_THRESHOLD = 5;

export interface ProductFilterParams {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  deal?: string;
  availability?: string;
  sort?: string;
  page?: string;
  badge?: string;
  membersOnly?: string;
  type?: string;
  filter?: string;
}

export interface ParsedProductFilters {
  q?: string;
  category?: string;
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  deals: DealKey[];
  availability?: AvailabilityKey;
  sort: SortKey;
  page: number;
  badge?: string;
  membersOnly: boolean;
  type?: string;
  flashFilter?: FlashFilterKey;
}

const DEAL_KEYS: DealKey[] = ["savo", "discount20", "rescue"];

export function parseProductFilters(params: ProductFilterParams): ParsedProductFilters {
  const page = Math.max(1, Number(params.page) || 1);
  const sort = SORT_KEYS.includes(params.sort as SortKey) ? (params.sort as SortKey) : "newest";
  const brands = params.brand ? params.brand.split(",").filter(Boolean) : [];
  const deals = params.deal ? (params.deal.split(",").filter((d): d is DealKey => DEAL_KEYS.includes(d as DealKey))) : [];
  const availability = params.availability === "in_stock" || params.availability === "low_stock" ? params.availability : undefined;
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  return {
    q: params.q || undefined,
    category: params.category || undefined,
    brands,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    deals,
    availability,
    sort,
    page,
    badge: params.badge || undefined,
    membersOnly: params.membersOnly === "true",
    type: params.type || undefined,
    flashFilter: FLASH_FILTER_KEYS.includes(params.filter as FlashFilterKey) ? (params.filter as FlashFilterKey) : undefined,
  };
}

/** Builds the Prisma where clause for the product listing. Fully SQL-expressible (no post-fetch JS filtering) so pagination/count stay accurate. */
export function buildProductWhere(
  filters: ParsedProductFilters,
  membersOnlyVisibility: Record<string, unknown>
): Prisma.ProductWhereInput {
  const dealTypeIn: ("DEAL" | "RESCUE")[] = [];
  if (filters.deals.includes("savo")) dealTypeIn.push("DEAL");
  if (filters.deals.includes("rescue")) dealTypeIn.push("RESCUE");

  return {
    status: "ACTIVE",
    approvalStatus: "APPROVED",
    ...membersOnlyVisibility,
    ...(filters.q ? { name: { contains: filters.q, mode: "insensitive" } } : {}),
    ...(filters.category ? { category: { slug: filters.category } } : {}),
    ...(filters.badge ? { badges: { some: { type: filters.badge as any } } } : {}),
    ...(filters.membersOnly ? { isMembersOnly: true } : {}),
    ...(filters.type ? { type: filters.type as any } : {}),
    ...(filters.brands.length ? { brandName: { in: filters.brands } } : {}),
    ...(filters.minPrice != null || filters.maxPrice != null
      ? { saveoPrice: { ...(filters.minPrice != null ? { gte: filters.minPrice } : {}), ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}) } }
      : {}),
    ...(filters.deals.includes("discount20") ? { discountPct: { gte: 20 } } : {}),
    ...(dealTypeIn.length ? { type: { in: dealTypeIn } } : {}),
    ...(filters.availability === "in_stock" ? { stockQty: { gt: 0 } } : {}),
    ...(filters.availability === "low_stock" ? { stockQty: { gt: 0, lte: LOW_STOCK_THRESHOLD } } : {}),
  };
}

/** Popular = real orderCount desc — the same canonical popularity signal already used by getTrending() in discovery-engine.ts and BEST_SELLER badge logic. */
export function buildProductOrderBy(sort: SortKey): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc": return { saveoPrice: "asc" };
    case "price_desc": return { saveoPrice: "desc" };
    case "discount": return { discountPct: "desc" };
    case "popular": return { orderCount: "desc" };
    default: return { createdAt: "desc" };
  }
}
