import { prisma } from "@/lib/prisma";
import { RelationType } from "@prisma/client";

/**
 * CrossSellService — Phase 4.3
 *
 * All product-recommendation surfaces driven by "what goes with what":
 * Frequently Bought Together, Related Products, and Smart Cart Suggestions.
 *
 * Architecture note: every method here is independent and swappable. The
 * FBT fallback chain in particular is deliberately staged so it can be
 * re-ordered or have a stage removed without touching callers — as real
 * order volume grows, `getCoPurchasedProducts` (real data) will
 * increasingly satisfy `take` on its own and the later fallback stages
 * will simply stop being reached.
 */

const productCardSelect = {
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

type ProductCard = Awaited<ReturnType<typeof prisma.product.findMany<{ select: typeof productCardSelect }>>>[number];

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export class CrossSellService {
  // -------------------------------------------------------------------
  // 1. FREQUENTLY BOUGHT TOGETHER
  // -------------------------------------------------------------------

  /**
   * Real signal: products that have appeared in the same SupplierOrder as
   * `productId` across actual order history, ranked by how often that's
   * happened. This is the "real data" path the spec asks for.
   */
  static async getCoPurchasedProducts(productId: string, take: number): Promise<ProductCard[]> {
    const rows = await prisma.$queryRaw<{ productId: string; coCount: bigint }[]>`
      SELECT oi2."productId" as "productId", COUNT(*) as "coCount"
      FROM order_items oi1
      JOIN order_items oi2
        ON oi1."supplierOrderId" = oi2."supplierOrderId"
       AND oi2."productId" != oi1."productId"
      WHERE oi1."productId" = ${productId}
      GROUP BY oi2."productId"
      ORDER BY "coCount" DESC
      LIMIT ${take}
    `;
    if (rows.length === 0) return [];

    const products = await prisma.product.findMany({
      where: { id: { in: rows.map((r) => r.productId) }, status: "ACTIVE", approvalStatus: "APPROVED" },
      select: productCardSelect,
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    // preserve co-purchase-frequency order
    return rows.map((r) => byId.get(r.productId)).filter((p): p is ProductCard => !!p);
  }

  /**
   * Full fallback chain, in priority order:
   *   1. Real co-purchase history (getCoPurchasedProducts)
   *   2. Curated FREQUENTLY_BOUGHT_TOGETHER relations (admin/supplier-set)
   *   3. Same category, best sellers first
   *   4. Same supplier, best sellers first
   *   5. Site-wide best sellers
   * Stops as soon as `take` items are gathered. Always excludes the
   * anchor product itself and anything already picked in an earlier stage.
   */
  static async getFrequentlyBoughtTogether(productId: string, take = 3): Promise<ProductCard[]> {
    const anchor = await prisma.product.findUnique({
      where: { id: productId },
      select: { ...productCardSelect, categoryId: true, supplierId: true },
    });
    if (!anchor) return [];

    let picks: ProductCard[] = await this.getCoPurchasedProducts(productId, take);

    if (picks.length < take) {
      const curated = await prisma.productRelation.findMany({
        where: { sourceId: productId, type: RelationType.FREQUENTLY_BOUGHT_TOGETHER },
        orderBy: { sortOrder: "asc" },
        take: take - picks.length,
        include: { target: { select: productCardSelect } },
      });
      picks = dedupeById([...picks, ...curated.map((r) => r.target)]);
    }

    if (picks.length < take) {
      const sameCategory = await prisma.product.findMany({
        where: { categoryId: anchor.categoryId, id: { notIn: [productId, ...picks.map((p) => p.id)] }, status: "ACTIVE", approvalStatus: "APPROVED" },
        orderBy: { orderCount: "desc" },
        take: take - picks.length,
        select: productCardSelect,
      });
      picks = dedupeById([...picks, ...sameCategory]);
    }

    if (picks.length < take) {
      const sameSupplier = await prisma.product.findMany({
        where: { supplierId: anchor.supplierId, id: { notIn: [productId, ...picks.map((p) => p.id)] }, status: "ACTIVE", approvalStatus: "APPROVED" },
        orderBy: { orderCount: "desc" },
        take: take - picks.length,
        select: productCardSelect,
      });
      picks = dedupeById([...picks, ...sameSupplier]);
    }

    if (picks.length < take) {
      const bestSellers = await prisma.product.findMany({
        where: { id: { notIn: [productId, ...picks.map((p) => p.id)] }, status: "ACTIVE", approvalStatus: "APPROVED" },
        orderBy: { orderCount: "desc" },
        take: take - picks.length,
        select: productCardSelect,
      });
      picks = dedupeById([...picks, ...bestSellers]);
    }

    return [anchor, ...picks];
  }

  // -------------------------------------------------------------------
  // 2. RELATED PRODUCTS — similar / same category / same brand / same supplier
  // -------------------------------------------------------------------

  static async getRelatedProducts(productId: string, take = 8): Promise<ProductCard[]> {
    const anchor = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, brand: true, supplierId: true },
    });
    if (!anchor) return [];

    // Curated relations first (admin/supplier-authored, highest quality signal)
    const curated = await prisma.productRelation.findMany({
      where: { sourceId: productId, type: RelationType.RELATED },
      orderBy: { sortOrder: "asc" },
      take,
      include: { target: { select: productCardSelect } },
    });
    let picks = curated.map((r) => r.target);

    if (picks.length < take) {
      // Same brand is a strong signal when available (e.g. other Lindt products)
      const sameBrand = anchor.brand
        ? await prisma.product.findMany({
            where: { brand: anchor.brand, id: { notIn: [productId, ...picks.map((p) => p.id)] }, status: "ACTIVE", approvalStatus: "APPROVED" },
            orderBy: { orderCount: "desc" },
            take: take - picks.length,
            select: productCardSelect,
          })
        : [];
      picks = dedupeById([...picks, ...sameBrand]);
    }

    if (picks.length < take) {
      const sameCategory = await prisma.product.findMany({
        where: { categoryId: anchor.categoryId, id: { notIn: [productId, ...picks.map((p) => p.id)] }, status: "ACTIVE", approvalStatus: "APPROVED" },
        orderBy: { orderCount: "desc" },
        take: take - picks.length,
        select: productCardSelect,
      });
      picks = dedupeById([...picks, ...sameCategory]);
    }

    if (picks.length < take) {
      const sameSupplier = await prisma.product.findMany({
        where: { supplierId: anchor.supplierId, id: { notIn: [productId, ...picks.map((p) => p.id)] }, status: "ACTIVE", approvalStatus: "APPROVED" },
        orderBy: { orderCount: "desc" },
        take: take - picks.length,
        select: productCardSelect,
      });
      picks = dedupeById([...picks, ...sameSupplier]);
    }

    return picks;
  }

  // -------------------------------------------------------------------
  // 4. SMART CART SUGGESTIONS — category-pairing rules (juice -> snacks, etc.)
  // -------------------------------------------------------------------

  /**
   * Complementary-category pairing rules. Keyed and valued by category
   * slug. Deliberately a plain data table (not hardcoded product logic)
   * so a supplier/admin tool can edit these later without a code change —
   * this is the "architecture allows evolving later" piece for this
   * section specifically.
   */
  static readonly CATEGORY_PAIRING_RULES: Record<string, string[]> = {
    "food-snacks": ["chocolates-sweets"],
    "chocolates-sweets": ["food-snacks"],
  };

  static async getSmartCartSuggestions(cartProductIds: string[], take = 6): Promise<ProductCard[]> {
    if (cartProductIds.length === 0) return [];

    // 1) Curated COMPLETE_YOUR_DEAL relations for anything in the cart
    const curated = await prisma.productRelation.findMany({
      where: {
        sourceId: { in: cartProductIds },
        type: RelationType.COMPLETE_YOUR_DEAL,
        targetId: { notIn: cartProductIds },
      },
      orderBy: { sortOrder: "asc" },
      include: { target: { select: productCardSelect } },
    });
    let picks = dedupeById(curated.map((r) => r.target));

    if (picks.length < take) {
      // 2) Category-pairing rules — real complementary categories, e.g. a
      // juice in the cart (food-snacks) surfaces chocolates-sweets items.
      const cartCategories = await prisma.product.findMany({
        where: { id: { in: cartProductIds } },
        select: { category: { select: { slug: true } } },
      });
      const pairedSlugs = new Set<string>();
      for (const { category } of cartCategories) {
        for (const slug of this.CATEGORY_PAIRING_RULES[category.slug] ?? []) pairedSlugs.add(slug);
      }
      if (pairedSlugs.size > 0) {
        const paired = await prisma.product.findMany({
          where: {
            category: { slug: { in: [...pairedSlugs] } },
            id: { notIn: [...cartProductIds, ...picks.map((p) => p.id)] },
            status: "ACTIVE", approvalStatus: "APPROVED",
          },
          orderBy: { orderCount: "desc" },
          take: take - picks.length,
          select: productCardSelect,
        });
        picks = dedupeById([...picks, ...paired]);
      }
    }

    if (picks.length < take) {
      // 3) Fallback: best sellers from the same categories already in the cart
      const cartProducts = await prisma.product.findMany({
        where: { id: { in: cartProductIds } },
        select: { categoryId: true },
      });
      const categoryIds = [...new Set(cartProducts.map((p) => p.categoryId))];
      const fallback = await prisma.product.findMany({
        where: {
          categoryId: { in: categoryIds },
          id: { notIn: [...cartProductIds, ...picks.map((p) => p.id)] },
          status: "ACTIVE", approvalStatus: "APPROVED",
        },
        orderBy: { orderCount: "desc" },
        take: take - picks.length,
        select: productCardSelect,
      });
      picks = dedupeById([...picks, ...fallback]);
    }

    return picks;
  }
}
