/**
 * CART ACCESS — READ ONLY
 * ============================================================
 * This function NEVER writes to the cart, never touches price,
 * discount, delivery fee, quantity, or order total in the
 * database. The delivery-fee threshold (15 KD / 1.5 KD) is
 * copied verbatim from checkout/route.ts's real logic.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { assertOwnership } from "./security";
import { CartIntelligenceData, DataFreshness } from "./types";

const FREE_DELIVERY_THRESHOLD = 15; // KD — copied from checkout/route.ts
const STANDARD_DELIVERY_FEE = 1.5; // KD — copied from checkout/route.ts

export async function getCartIntelligence(customerId: string, requestingUserId: string | null): Promise<CartIntelligenceData> {
  assertOwnership(requestingUserId, customerId, "cart data");

  const [cart, membership] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId: customerId },
      select: { items: { select: { quantity: true, product: { select: { id: true, name: true, saveoPrice: true } } } } },
    }),
    prisma.membership.findUnique({ where: { userId: customerId }, select: { status: true } }),
  ]);

  const items = (cart?.items ?? []).map((i) => ({
    productId: i.product.id,
    productName: i.product.name,
    quantity: i.quantity,
    unitPrice: Number(i.product.saveoPrice),
    lineTotal: Number((Number(i.product.saveoPrice) * i.quantity).toFixed(3)),
  }));

  const subtotal = Number(items.reduce((s, i) => s + i.lineTotal, 0).toFixed(3));
  const isActiveMember = membership?.status === "ACTIVE";

  const discount: number | null = null;

  const deliveryFee = isActiveMember ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const missingAmountForFreeDelivery = isActiveMember || subtotal >= FREE_DELIVERY_THRESHOLD
    ? null
    : Number((FREE_DELIVERY_THRESHOLD - subtotal).toFixed(3));

  const freshness: DataFreshness = { source: "CART_DATA", generatedAt: new Date().toISOString(), dataAgeMs: 0 };

  return {
    customerId,
    items,
    subtotal,
    discount,
    deliveryFee,
    total: Number((subtotal + deliveryFee).toFixed(3)),
    missingAmountForFreeDelivery,
    freshness,
  };
}
