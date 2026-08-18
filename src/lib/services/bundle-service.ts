import { prisma } from "@/lib/prisma";

/**
 * BundleService — Phase 4.3
 *
 * "Buy A + B, get a discount or a free item." A Bundle is satisfied when
 * every non-reward BundleItem's `requiredQuantity` is met in the cart.
 * Pricing is calculated here (not stored) so it always reflects current
 * product prices — a Bundle references products, not frozen price
 * snapshots.
 */

const productCardSelect = {
  id: true,
  name: true,
  nameAr: true,
  slug: true,
  brandName: true,
  originalPrice: true,
  saveoPrice: true,
  images: { take: 1, orderBy: { sortOrder: "asc" as const } },
};

export interface BundlePricing {
  bundleId: string;
  name: string;
  nameAr: string | null;
  requiredProducts: { productId: string; name: string; quantity: number; saveoPrice: number }[];
  rewardProduct: { productId: string; name: string; saveoPrice: number } | null;
  subtotal: number; // sum of required items at normal Saveo price (+ reward item's price if FREE_ITEM)
  discountAmount: number;
  finalPrice: number;
}

export class BundleService {
  /** All currently-active, in-window bundles — for a homepage/marketing rail. */
  static async getActiveBundles() {
    const now = new Date();
    return prisma.bundle.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { items: { include: { product: { select: productCardSelect } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Bundles that include this product as a required (non-reward) item — for PDP display. */
  static async getBundlesForProduct(productId: string) {
    const now = new Date();
    return prisma.bundle.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        items: { some: { productId, isRewardItem: false } },
      },
      include: { items: { include: { product: { select: productCardSelect } } } },
    });
  }

  /** Which of the given bundles are fully satisfied by what's in the cart right now. */
  static async getApplicableBundlesForCart(cartProductIds: string[]) {
    if (cartProductIds.length === 0) return [];
    const now = new Date();
    const bundles = await prisma.bundle.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { items: { include: { product: { select: productCardSelect } } } },
    });

    return bundles.filter((bundle) => {
      const required = bundle.items.filter((i) => !i.isRewardItem);
      return required.every((req) => cartProductIds.includes(req.productId));
    });
  }

  /** Computes the price breakdown for a bundle at current product prices. */
  static calculatePricing(bundle: Awaited<ReturnType<typeof BundleService.getActiveBundles>>[number]): BundlePricing {
    const required = bundle.items.filter((i) => !i.isRewardItem);
    const reward = bundle.items.find((i) => i.isRewardItem) ?? null;

    const requiredProducts = required.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      quantity: i.requiredQuantity,
      saveoPrice: Number(i.product.saveoPrice),
    }));

    const requiredSubtotal = requiredProducts.reduce((sum, p) => sum + p.saveoPrice * p.quantity, 0);
    const rewardPrice = reward ? Number(reward.product.saveoPrice) : 0;
    const subtotal = requiredSubtotal + (bundle.discountType === "FREE_ITEM" ? rewardPrice : 0);

    let discountAmount = 0;
    if (bundle.discountType === "PERCENTAGE") {
      discountAmount = (subtotal * Number(bundle.discountValue)) / 100;
    } else if (bundle.discountType === "FIXED_AMOUNT") {
      discountAmount = Number(bundle.discountValue);
    } else if (bundle.discountType === "FREE_ITEM") {
      discountAmount = rewardPrice;
    }
    discountAmount = Math.min(discountAmount, subtotal);

    return {
      bundleId: bundle.id,
      name: bundle.name,
      nameAr: bundle.nameAr,
      requiredProducts,
      rewardProduct: reward
        ? { productId: reward.productId, name: reward.product.name, saveoPrice: Number(reward.product.saveoPrice) }
        : null,
      subtotal,
      discountAmount,
      finalPrice: subtotal - discountAmount,
    };
  }
}
