import { prisma } from "@/lib/prisma";

/**
 * FlashDealService — Phase 5.3 §5, extended with the full status machine
 * from the productivity-upgrade brief (§6-7).
 *
 * States: DRAFT -> SCHEDULED -> LIVE -> COMPLETED, with PAUSED as a
 * manual side-branch from LIVE/SCHEDULED. `status` is now the single
 * source of truth for "is this deal actually running" — self-healing on
 * every read (same lazy-expiry pattern used by CampaignService and
 * MembershipService elsewhere in this codebase).
 *
 * Security: `soldCount`/`buyerCount` only ever increment server-side
 * (checkout), and `getRemainingStock` is the only source of truth for
 * how many units are left — never trust a client-supplied number.
 */
export class FlashDealService {
  static async getAll() {
    const deals = await prisma.flashDeal.findMany({
      orderBy: { startAt: "desc" },
      include: { product: { select: { name: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
    });
    // Self-heal expiry on every list view too, so the admin dashboard
    // never shows a deal as LIVE/SCHEDULED after its window has passed.
    await this.settleExpired(deals.map((d) => d.id));
    return prisma.flashDeal.findMany({
      orderBy: { startAt: "desc" },
      include: { product: { select: { name: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
    });
  }

  private static async settleExpired(ids: string[]) {
    const now = new Date();
    await prisma.flashDeal.updateMany({
      where: { id: { in: ids }, status: { in: ["SCHEDULED", "LIVE", "PAUSED"] }, endAt: { lte: now } },
      data: { status: "COMPLETED" },
    });
    // A SCHEDULED deal whose startAt has arrived (and endAt hasn't passed) goes LIVE automatically.
    await prisma.flashDeal.updateMany({
      where: { id: { in: ids }, status: "SCHEDULED", startAt: { lte: now }, endAt: { gt: now } },
      data: { status: "LIVE" },
    });
  }

  static async create(params: {
    productId: string;
    discountPercent: number;
    startAt: Date;
    endAt: Date;
    stockLimit: number;
  }) {
    const now = new Date();
    const status = params.startAt > now ? "SCHEDULED" : "LIVE";
    return prisma.flashDeal.create({ data: { ...params, status, isActive: true } });
  }

  // --- Control buttons (§6) ---------------------------------------------

  static async startNow(id: string) {
    return prisma.flashDeal.update({ where: { id }, data: { startAt: new Date(), status: "LIVE" } });
  }

  static async pause(id: string) {
    return prisma.flashDeal.update({ where: { id }, data: { status: "PAUSED" } });
  }

  /** Resumes a PAUSED deal — LIVE if within its time window, otherwise SCHEDULED. */
  static async resume(id: string) {
    const deal = await prisma.flashDeal.findUniqueOrThrow({ where: { id } });
    const now = new Date();
    const status = deal.startAt <= now && deal.endAt > now ? "LIVE" : "SCHEDULED";
    return prisma.flashDeal.update({ where: { id }, data: { status } });
  }

  static async stop(id: string) {
    return prisma.flashDeal.update({ where: { id }, data: { status: "COMPLETED", endAt: new Date() } });
  }

  static async extendTime(id: string, newEndAt: Date) {
    const deal = await prisma.flashDeal.findUniqueOrThrow({ where: { id } });
    const now = new Date();
    // Extending a COMPLETED deal past "now" revives it.
    const status = deal.status === "COMPLETED" && newEndAt > now ? (deal.startAt <= now ? "LIVE" : "SCHEDULED") : deal.status;
    return prisma.flashDeal.update({ where: { id }, data: { endAt: newEndAt, status } });
  }

  static async setActive(id: string, isActive: boolean) {
    // Legacy toggle, kept for the existing admin toggle UI — maps onto the new status machine.
    return isActive ? this.resume(id) : this.pause(id);
  }

  /** The live deal for a product right now, if any — self-healing + stock check. */
  /** All currently LIVE deals, for a homepage/rail-style display — not scoped to one product. */
  static async getAllLiveDeals(limit = 8) {
    const now = new Date();
    const candidates = await prisma.flashDeal.findMany({
      where: { status: { in: ["SCHEDULED", "LIVE"] }, startAt: { lte: now }, endAt: { gt: now } },
      orderBy: { startAt: "desc" },
    });
    if (candidates.length === 0) return [];

    await this.settleExpired(candidates.map((c) => c.id));

    const live = await prisma.flashDeal.findMany({
      where: { id: { in: candidates.map((c) => c.id) }, status: "LIVE" },
      include: { product: { select: { id: true, name: true, nameAr: true, slug: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
      take: limit,
    });

    // Sold-out deals are technically still "LIVE" status until the settle job catches them — filter here too, same rule as getLiveDealForProduct.
    return live.filter((d) => d.soldCount < d.stockLimit);
  }

  static async getLiveDealForProduct(productId: string) {
    const now = new Date();
    const candidate = await prisma.flashDeal.findFirst({
      where: { productId, status: { in: ["SCHEDULED", "LIVE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!candidate) return null;

    await this.settleExpired([candidate.id]);
    const deal = await prisma.flashDeal.findUnique({ where: { id: candidate.id } });
    if (!deal || deal.status !== "LIVE") return null;
    if (deal.soldCount >= deal.stockLimit) return null; // sold out — no longer live even though the time window is open

    prisma.flashDeal.update({ where: { id: deal.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    return deal;
  }

  static getRemainingStock(deal: { stockLimit: number; soldCount: number }): number {
    return Math.max(0, deal.stockLimit - deal.soldCount);
  }

  static effectivePrice(originalSaveoPrice: number, discountPercent: number): number {
    return Number((originalSaveoPrice * (1 - discountPercent / 100)).toFixed(3));
  }

  /** Called from checkout when an order includes a product with a live flash deal. Increments soldCount + buyerCount, capped at stockLimit — must be called within the same transaction as the rest of checkout. */
  /** Called from checkout when an order includes a product with a live
   * flash deal — see src/app/api/checkout/route.ts. Atomic conditional
   * update: `stockLimit` is read once (an admin-set config value, not
   * concurrently mutated by checkouts), but the actual guard —
   * `soldCount <= stockLimit - quantity` — is evaluated by Postgres
   * itself as part of the UPDATE's WHERE match against the row's live
   * state, inside this same transaction. Two concurrent checkouts
   * racing for the last units can never both pass: the second one's
   * UPDATE sees the first's already-incremented soldCount and matches
   * zero rows. This replaces the previous read-then-check-in-JS-then-
   * write version, which had a real race window. Returns false (claims
   * nothing) if there isn't room for the full quantity — the caller
   * must roll back the whole checkout transaction in that case (a deal
   * offer never partially claims). */
  static async recordSaleIfRoom(tx: any, dealId: string, quantity: number): Promise<boolean> {
    const deal = await tx.flashDeal.findUnique({ where: { id: dealId }, select: { stockLimit: true } });
    if (!deal) return false;
    const result = await tx.flashDeal.updateMany({
      where: { id: dealId, soldCount: { lte: deal.stockLimit - quantity } },
      data: { soldCount: { increment: quantity }, buyerCount: { increment: 1 } },
    });
    return result.count > 0;
  }

  /** Symmetric release for a verified-safe cancellation transition —
   * see src/app/api/admin/orders/[id]/status/route.ts. Guarded so a
   * double-release (e.g. retried cancellation) can never push
   * soldCount negative. */
  static async releaseSale(tx: any, dealId: string, quantity: number): Promise<void> {
    await tx.flashDeal.updateMany({
      where: { id: dealId, soldCount: { gte: quantity } },
      data: { soldCount: { decrement: quantity } },
    });
  }
}
