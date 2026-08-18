import { prisma } from "@/lib/prisma";

/**
 * AuctionService — Phase 5.3 §6
 *
 * A ready framework: real bid placement, minimum-increment enforcement,
 * and winner determination all work — but no auction is ever reachable
 * by a customer unless an admin explicitly sets `isEnabled: true` (see
 * schema comment). This is the "not activated except by Admin"
 * requirement enforced at the data layer, not just hidden in the UI.
 */

export class InvalidBidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBidError";
  }
}

export class AuctionService {
  static async create(params: {
    productId: string;
    startingPrice: number;
    minIncrement: number;
    startTime: Date;
    endTime: Date;
  }) {
    return prisma.auction.create({ data: { ...params, status: "SCHEDULED" } });
  }

  static async setEnabled(id: string, isEnabled: boolean) {
    return prisma.auction.update({ where: { id }, data: { isEnabled } });
  }

  static async getAll() {
    return prisma.auction.findMany({
      orderBy: { startTime: "desc" },
      include: { product: { select: { name: true } }, _count: { select: { bids: true } } },
    });
  }

  /** The current highest bid, or the starting price if there are no bids yet. */
  static async getCurrentPrice(auctionId: string): Promise<number> {
    const auction = await prisma.auction.findUniqueOrThrow({ where: { id: auctionId } });
    const topBid = await prisma.auctionBid.findFirst({ where: { auctionId }, orderBy: { amount: "desc" } });
    return topBid ? Number(topBid.amount) : Number(auction.startingPrice);
  }

  /**
   * Places a bid. Every check is server-side: the auction must be
   * enabled + within its time window, and the bid must clear the current
   * price by at least `minIncrement` — the client only ever sends an
   * intended amount, never a "this is valid" claim.
   */
  static async placeBid(auctionId: string, userId: string, amount: number) {
    const auction = await prisma.auction.findUniqueOrThrow({ where: { id: auctionId } });
    const now = new Date();

    if (!auction.isEnabled) throw new InvalidBidError("This auction isn't active.");
    if (now < auction.startTime) throw new InvalidBidError("This auction hasn't started yet.");
    if (now > auction.endTime) throw new InvalidBidError("This auction has already ended.");

    const currentPrice = await this.getCurrentPrice(auctionId);
    const minValidBid = currentPrice + Number(auction.minIncrement);
    if (amount < minValidBid) {
      throw new InvalidBidError(`Your bid must be at least KD ${minValidBid.toFixed(3)}.`);
    }

    return prisma.auctionBid.create({ data: { auctionId, userId, amount } });
  }

  /** Determines and records the winner — call this after endTime has passed (e.g. from a scheduled job, or lazily on read). */
  static async settleIfEnded(auctionId: string) {
    const auction = await prisma.auction.findUniqueOrThrow({ where: { id: auctionId } });
    if (auction.status === "ENDED" || new Date() < auction.endTime) return auction;

    const topBid = await prisma.auctionBid.findFirst({ where: { auctionId }, orderBy: { amount: "desc" } });

    return prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: "ENDED",
        winnerId: topBid?.userId ?? null,
        winningBid: topBid?.amount ?? null,
      },
    });
  }
}
