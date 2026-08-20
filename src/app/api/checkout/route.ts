import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateOrderNumber, generateSupplierOrderNumber } from "@/lib/utils";
import { reserveStock, getAvailableStock } from "@/lib/inventory";
import { createPendingReveal } from "@/lib/mystery-box";
import { MysteryBoxAnalytics } from "@/lib/mystery-box-analytics";
import { NotificationService } from "@/lib/notifications/service";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { MysterySafeService } from "@/lib/services/mystery-safe-service";
import { GoldenTicketService } from "@/lib/services/golden-ticket-service";
import { ChallengeProgressService } from "@/lib/services/challenge-progress-service";
import { LoyaltyService } from "@/lib/services/loyalty-service";
import { MarketingAutomationService } from "@/lib/services/marketing-automation-service";
import { MembershipService } from "@/lib/services/membership-service";
import { BenefitEngine } from "@/lib/services/benefit-engine";
import { getEffectivePrice, canAccessPlusProduct } from "@/lib/services/plus-merchandising-service";
import { PaymentService } from "@/lib/services/payment-service";
import { GiftCardService } from "@/lib/services/gift-card-service";
import { AffiliateService } from "@/lib/services/affiliate-service";
import { FlashDealService } from "@/lib/services/flash-deal-service";
import { DealOfTheHourService } from "@/lib/services/deal-of-the-hour-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().min(1) })).min(1),
  mysteryBoxChoices: z.record(z.string(), z.array(z.string())).optional(),
  address: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
    governorate: z.string(),
    area: z.string(),
    block: z.string().optional(),
    street: z.string().optional(),
    building: z.string().optional(),
    notes: z.string().optional(),
  }),
  paymentMethod: z.enum(["KNET", "CARD", "COD"]),
  analyticsSessionId: z.string().optional(),
  isGift: z.boolean().optional(),
  giftMessage: z.string().max(500).optional(),
  giftWrapRequested: z.boolean().optional(),
  scheduledDeliveryDate: z.string().optional(),
  giftCardCode: z.string().optional(),
});

const GIFT_WRAP_FEE = 1.0;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to checkout." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${session.user.id}:checkout`, RATE_LIMITS.CHECKOUT);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit exceeded on checkout", { userId: session.user.id });
    return NextResponse.json(
      { error: "Too many checkout attempts. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
    );
  }

  const body = checkoutSchema.parse(await req.json());

  const products = await prisma.product.findMany({
    where: { id: { in: body.items.map((i) => i.productId) } },
    include: { supplier: true },
  });

  // Deal attribution is resolved SERVER-SIDE only, from the verified
  // product ids above — never from any client-supplied deal id. Real
  // atomicity/oversell protection happens inside the checkout
  // transaction below (see recordSaleIfRoom/claimUnits); this lookup
  // just identifies WHICH deal (if any) currently applies to each
  // product, using the exact same "active" definitions already used
  // elsewhere (getAllLiveDeals / getDealOfTheHour).
  const productIds = products.map((p) => p.id);
  const now = new Date();
  const [activeFlashDeals, activeHourDeal] = await Promise.all([
    prisma.flashDeal.findMany({ where: { productId: { in: productIds }, status: "LIVE", startAt: { lte: now }, endAt: { gt: now } } }),
    prisma.dealOfTheHour.findFirst({ where: { isActive: true, endTime: { gt: now }, productId: { in: productIds } } }),
  ]);
  const flashDealByProductId = new Map(activeFlashDeals.map((d) => [d.productId, d]));

  // Validate against AVAILABLE stock (stockQty - reservedStock), not raw
  // stockQty — this is what prevents overselling when multiple customers
  // check out the same low-stock item concurrently.
  for (const item of body.items) {
    const product = products.find((p) => p.id === item.productId);
    const available = product ? getAvailableStock(product.stockQty, product.reservedStock) : 0;
    if (!product || available < item.quantity) {
      return NextResponse.json(
        { error: `${product?.name ?? "An item"} is no longer available in that quantity.` },
        { status: 400 }
      );
    }
  }

  // Membership is resolved BEFORE pricing — the effective price for
  // every item depends on it (getEffectivePrice), not just the
  // pre-existing members-only gate below.
  const membership = await MembershipService.getUserMembership(session.user.id);
  const isActiveMember = !!membership && membership.status === "ACTIVE" && membership.endsAt > new Date();

  // SAVO Plus Drop enforcement — server-authoritative, never trusts the
  // client's cart price or any UI state. A product that fails its Plus
  // access rule (Members Only, or inside an Early Access window) is
  // rejected here even if it was somehow added to the cart client-side.
  for (const product of products) {
    if (!canAccessPlusProduct(product as any, isActiveMember, now)) {
      return NextResponse.json(
        { error: `${product.name} is exclusive to active SAVO Plus members right now.` },
        { status: 403 }
      );
    }
  }

  const subtotal = body.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return sum + getEffectivePrice(product as any, isActiveMember, now) * item.quantity;
  }, 0);
  const originalTotal = body.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return sum + Number(product.originalPrice) * item.quantity;
  }, 0);
  // The Plus "Extra Discount" benefit stacks on top of an item's real
  // price ONLY when that item has no discount of its own — an item
  // already marked down (originalPrice > saveoPrice) is excluded from
  // this subtotal, so the extra % never applies on top of an existing
  // deal/Rescue/Mystery-Box-style discount.
  const discountEligibleSubtotal = body.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const effectivePrice = getEffectivePrice(product as any, isActiveMember, now);
    const alreadyDiscounted = Number(product.originalPrice) > effectivePrice;
    return alreadyDiscounted ? sum : sum + effectivePrice * item.quantity;
  }, 0);

  // Defense-in-depth: members-only products must never be purchasable by
  // non-members, even if the UI (which hides them entirely) is bypassed.
  const membersOnlyInCart = products.filter((p) => p.isMembersOnly);
  if (membersOnlyInCart.length > 0 && !BenefitEngine.canAccessExclusiveDeals(membership as any)) {
    return NextResponse.json(
      { error: `${membersOnlyInCart[0].name} is exclusive to Savo Plus members.` },
      { status: 403 }
    );
  }

  // Saveo Plus members get free delivery (if their plan grants it) and an
  // extra percentage discount (if their plan grants it) — both driven by
  // BenefitEngine, never hardcoded here.
  const membershipExtraDiscount = BenefitEngine.calculateExtraDiscount(membership as any, discountEligibleSubtotal);
  const hasFreeDelivery = BenefitEngine.hasFreeDelivery(membership as any);
  const deliveryFee = hasFreeDelivery ? 0 : subtotal >= 15 ? 0 : 1.5;
  const giftWrapFee = body.giftWrapRequested ? GIFT_WRAP_FEE : 0;
  const totalBeforeGiftCard = subtotal - membershipExtraDiscount + deliveryFee + giftWrapFee;

  // Validate the gift card BEFORE the transaction (read-only check) — the actual balance
  // deduction happens inside the transaction below, atomically with order creation.
  let giftCardApplied = 0;
  if (body.giftCardCode) {
    const giftCardCheck = await GiftCardService.checkBalance(body.giftCardCode);
    if (!giftCardCheck.valid) {
      return NextResponse.json({ error: giftCardCheck.reason ?? "Invalid gift card." }, { status: 400 });
    }
    giftCardApplied = Math.min(giftCardCheck.balance, totalBeforeGiftCard);
  }

  const total = totalBeforeGiftCard - giftCardApplied;

  // Group cart items by supplier — this is the multi-vendor split point.
  // Each group below becomes exactly one SupplierOrder.
  const itemsBySupplier = new Map<string, typeof body.items>();
  for (const item of body.items) {
    const product = products.find((p) => p.id === item.productId)!;
    const list = itemsBySupplier.get(product.supplierId) ?? [];
    list.push(item);
    itemsBySupplier.set(product.supplierId, list);
  }

  // Populated inside the transaction below, read after it commits — used
  // to notify each supplier of their new order without awaiting anything
  // inside the transaction itself.
  const createdSupplierOrders: { supplierId: string; supplierOrderNumber: string }[] = [];

  let order;
  try {
    order = await prisma.$transaction(
    async (tx) => {
    // Minimal default-address invariant fix — first-ever address for
    // this customer becomes their default (needed for Subscribe &
    // Save's processOne() to ever find one); an existing default is
    // never silently replaced by a later checkout. Full saved-address
    // selection at checkout is a separate, later task.
    const existingAddressCount = await tx.address.count({ where: { userId: session.user!.id! } });
    const address = await tx.address.create({
      data: { userId: session.user!.id!, ...body.address, isDefault: existingAddressCount === 0 },
    });

    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: session.user!.id!,
        addressId: address.id,
        paymentMethod: body.paymentMethod,
        subtotal,
        discountTotal: originalTotal - subtotal + membershipExtraDiscount,
        deliveryFee,
        total,
        isMembershipOrder: isActiveMember,
        status: "PENDING",
        isGift: body.isGift ?? false,
        giftMessage: body.giftMessage,
        giftWrapRequested: body.giftWrapRequested ?? false,
        giftWrapFee,
        scheduledDeliveryDate: body.scheduledDeliveryDate ? new Date(body.scheduledDeliveryDate) : null,
        giftCardAmountApplied: giftCardApplied,
        history: { create: { status: "PENDING", note: "Order placed" } },
      },
    });

    // Redeem the gift card atomically with order creation, inside this SAME transaction
    // (GiftCardService.redeemToOrder opens its own transaction, so it can't be reused here —
    // this inlines the identical logic against `tx` instead).
    if (body.giftCardCode && giftCardApplied > 0) {
      const giftCard = await tx.giftCard.findUniqueOrThrow({ where: { code: body.giftCardCode.toUpperCase() } });
      const newBalance = Number(giftCard.remainingBalance) - giftCardApplied;
      await tx.giftCard.update({
        where: { id: giftCard.id },
        data: { remainingBalance: newBalance, status: newBalance <= 0 ? "REDEEMED" : "ACTIVE" },
      });
      await tx.giftCardRedemption.create({ data: { giftCardId: giftCard.id, orderId: newOrder.id, amountUsed: giftCardApplied } });
    }

    // Create one SupplierOrder (+ its OrderItems + commission transaction)
    // per vendor represented in the cart.
    for (const [supplierId, supplierItems] of itemsBySupplier) {
      const product0 = products.find((p) => p.id === supplierItems[0].productId)!;
      const commissionRate = product0.supplier.commissionRate;

      const supplierSubtotal = supplierItems.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return sum + getEffectivePrice(product as any, isActiveMember, now) * item.quantity;
      }, 0);
      const commissionAmount = (supplierSubtotal * Number(commissionRate)) / 100;
      const supplierPayout = supplierSubtotal - commissionAmount;

      const supplierOrder = await tx.supplierOrder.create({
        data: {
          orderId: newOrder.id,
          supplierId,
          supplierOrderNumber: generateSupplierOrderNumber(),
          status: "PENDING",
          subtotal: supplierSubtotal,
          commissionRate,
          commissionAmount,
          supplierPayout,
          history: { create: { status: "PENDING", note: "Order placed" } },
          items: {
            create: supplierItems.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              const effectivePrice = getEffectivePrice(product as any, isActiveMember, now);
              return {
                productId: product.id,
                productName: product.name,
                unitPrice: effectivePrice,
                originalPrice: product.originalPrice,
                quantity: item.quantity,
                lineTotal: effectivePrice * item.quantity,
              };
            }),
          },
        },
        include: { items: true }, // needed below to link mystery-box reveals to the generated OrderItem ids
      });

      createdSupplierOrders.push({ supplierId, supplierOrderNumber: supplierOrder.supplierOrderNumber! });

      // Mystery boxes never reveal their contents at checkout time — just
      // create the pending reveal record here. The actual item selection
      // happens later, when the customer opens the box (see
      // src/lib/mystery-box.ts openMysteryBoxReveal).
      for (const orderItem of supplierOrder.items) {
        const product = products.find((p) => p.id === orderItem.productId)!;

        // Deal claiming happens inside this SAME transaction as order
        // creation — never after it. A failed claim throws, which rolls
        // back the entire order (never a partial order with a deal that
        // silently didn't apply). Quantity is claimed in full, not once
        // per order — a quantity-3 purchase claims 3 units.
        const flashDeal = flashDealByProductId.get(orderItem.productId);
        if (flashDeal) {
          const claimed = await FlashDealService.recordSaleIfRoom(tx, flashDeal.id, orderItem.quantity);
          if (!claimed) throw new Error(`FLASH_DEAL_SOLD_OUT:${product.name}`);
        }
        if (activeHourDeal && activeHourDeal.productId === orderItem.productId) {
          const claimed = await DealOfTheHourService.claimUnits(tx, activeHourDeal.id, orderItem.quantity);
          if (!claimed) throw new Error(`SAVO_HOUR_SOLD_OUT:${product.name}`);
        }

        if (product.type === "MYSTERY_BOX") {
          await createPendingReveal(tx, {
            orderItemId: orderItem.id,
            userId: session.user!.id,
            chosenProductIds: body.mysteryBoxChoices?.[product.id],
          });
          MysteryBoxAnalytics.purchased(product.id, session.user!.id, orderItem.id, orderItem.quantity);
        }
      }

      // One commission-tracking transaction per supplier order — the
      // source of truth the commission engine and payout batching read from.
      await tx.supplierTransaction.create({
        data: {
          supplierId,
          supplierOrderId: supplierOrder.id,
          saleAmount: supplierSubtotal,
          commissionAmount,
          supplierAmount: supplierPayout,
          status: "PENDING",
        },
      });
    }

    // Reserve stock (does NOT touch stockQty yet — see src/lib/inventory.ts)
    // and bump order counts for best-seller ranking.
    for (const item of body.items) {
      const product = products.find((p) => p.id === item.productId)!;
      await reserveStock(tx, {
        productId: item.productId,
        supplierId: product.supplierId,
        quantity: item.quantity,
        userId: session.user!.id,
        note: `Reserved for order ${newOrder.orderNumber}`,
      });
      await tx.product.update({
        where: { id: item.productId },
        data: { orderCount: { increment: item.quantity } },
      });
    }

    return newOrder;
    },
    { timeout: 20000, maxWait: 10000 } // generous headroom for the full multi-vendor + mystery-box + inventory-history flow, especially over Neon's network latency
  );
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "One or more items sold out while you were checking out — please review your cart and try again." },
        { status: 409 }
      );
    }
    if (err instanceof Error && err.message.startsWith("FLASH_DEAL_SOLD_OUT:")) {
      return NextResponse.json(
        { error: `The flash deal for ${err.message.split(":")[1]} just sold out — please review your cart and try again.` },
        { status: 409 }
      );
    }
    if (err instanceof Error && err.message.startsWith("SAVO_HOUR_SOLD_OUT:")) {
      return NextResponse.json(
        { error: `The SAVO Hour offer for ${err.message.split(":")[1]} just sold out — please review your cart and try again.` },
        { status: 409 }
      );
    }
    throw err;
  }

  // Affiliate attribution — reads the real 30-day cookie set by AffiliateTracker
  // on a ?ref=CODE visit, never a client-supplied field (prevents a customer
  // from just passing any affiliate's code in the request body to steal commission).
  const refCookie = (await cookies()).get("savo_ref")?.value;
  if (refCookie) {
    const orderItemsForAttribution = body.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return { productId: item.productId, lineSubtotal: getEffectivePrice(product as any, isActiveMember, now) * item.quantity };
    });
    await AffiliateService.attributeOrder(refCookie, order.id, subtotal, session.user!.id, orderItemsForAttribution).catch(() => {});
  }

  // Checkout depends on the Payment Layer, not inline payment logic — see
  // src/lib/services/payment-service.ts. COD (the only live path today)
  // returns AWAITING_DELIVERY immediately. KNET/CARD/etc. are registered
  // provider slots that currently report they're not yet connected to a
  // real gateway; we log that honestly rather than silently pretending to
  // have charged the customer, but we don't block order creation on it —
  // per this phase's explicit brief, no real gateway is wired up yet.
  const paymentResult = await PaymentService.initiatePayment(body.paymentMethod, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: total,
    currency: "KWD",
    customerEmail: session.user.email ?? "",
    returnUrl: `/account/orders/${order.id}`,
  });
  if (paymentResult.status === "FAILED" && body.paymentMethod !== "COD") {
    logger.info("Order placed with a payment method not yet connected to a live gateway", {
      orderId: order.id,
      paymentMethod: body.paymentMethod,
      detail: paymentResult.error,
    });
  }

  // Phase 6.1 — real financial audit trail. Every payment attempt is now tracked, not just implied by Order.paymentMethod.
  await PaymentService.createPayment({
    orderId: order.id,
    method: body.paymentMethod,
    amount: total,
    initiationResult: paymentResult,
  }).catch((err) => logger.error("Could not record PaymentTransaction", err, { orderId: order.id }));

  // Notification events (Phase 5) — dispatched after the transaction has
  // already committed, per NotificationService's fire-and-forget contract.
  NotificationService.dispatch({
    type: "ORDER_CREATED",
    recipientUserId: session.user.id,
    recipientEmail: session.user.email,
    data: { orderId: order.id, orderNumber: order.orderNumber, total },
  });
  AnalyticsService.track({
    type: "ORDER_COMPLETE",
    sessionId: body.analyticsSessionId ?? session.user.id,
    userId: session.user.id,
    metadata: { orderId: order.id, total },
  });
  MysterySafeService.grantKey(session.user.id, "PURCHASE").catch(() => {});
  const goldenTicketResult = await GoldenTicketService.rollForOrder(session.user.id, order.id);

  // Brand Center (Phase 5.4 §14) — attribute this purchase to any brand
  // whose sponsored product was in the order. Simplified attribution: any
  // product with a currently-ACTIVE sponsored slot counts, not strictly
  // last-click — a reasonable trade-off given no cart-level slot tracking exists yet.
  (async () => {
    const purchasedProductIds = body.items.map((i) => i.productId);
    const activeSlots = await prisma.sponsoredSlot.findMany({
      where: { productId: { in: purchasedProductIds }, status: "ACTIVE" },
      select: { brandId: true },
    });
    for (const slot of activeSlots) {
      await prisma.brandEvent.create({
        data: { brandId: slot.brandId, eventType: "PURCHASE", userId: session.user!.id, metadata: { orderId: order.id, orderTotal: total } },
      }).catch(() => {});
    }
    await ChallengeProgressService.updateProgressForOrder(session.user!.id, purchasedProductIds, total).catch(() => {});
    await LoyaltyService.earnFromOrder(session.user!.id, total, order.id).catch((err) => logger.error("Could not award loyalty points", err, { orderId: order.id }));
  await MarketingAutomationService.checkAfterPurchase(session.user!.id).catch(() => {});
  })();

  const hasMysteryBox = body.items.some((item) => products.find((p) => p.id === item.productId)?.type === "MYSTERY_BOX");
  if (hasMysteryBox) {
    NotificationService.dispatch({
      type: "MYSTERY_BOX_READY",
      recipientUserId: session.user.id,
      recipientEmail: session.user.email,
      data: { orderId: order.id, orderNumber: order.orderNumber },
    });
  }

  if (createdSupplierOrders.length > 0) {
    const supplierOwners = await prisma.supplier.findMany({
      where: { id: { in: createdSupplierOrders.map((s) => s.supplierId) } },
      select: { id: true, email: true },
    });
    const emailBySupplierId = new Map(supplierOwners.map((s) => [s.id, s.email]));
    for (const { supplierId, supplierOrderNumber } of createdSupplierOrders) {
      const email = emailBySupplierId.get(supplierId);
      if (email) {
        NotificationService.dispatch({
          type: "NEW_SUPPLIER_ORDER",
          recipientEmail: email,
          data: { supplierOrderNumber },
        });
      }
    }
  }

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    membershipSavings: membershipExtraDiscount,
    goldenTicket: goldenTicketResult,
  });
}
