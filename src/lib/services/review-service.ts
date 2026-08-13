import { prisma } from "@/lib/prisma";

/**
 * ReviewService — Phase 8.1 (Enterprise Reviews)
 *
 * "Verified Purchase" is snapshotted at review-creation time from a
 * real DELIVERED order containing this product — not a live
 * recomputation. "Spam detection" is a real, simple rule (near-
 * duplicate text from the same user, or posting faster than a person
 * could type) — not a trained model, honestly scoped.
 */
export class ReviewService {
  static async hasVerifiedPurchase(userId: string, productId: string): Promise<boolean> {
    const delivered = await prisma.orderItem.findFirst({
      where: {
        productId,
        supplierOrder: { status: "DELIVERED", order: { userId } },
      },
    });
    return !!delivered;
  }

  private static async checkSpamSignals(userId: string, comment: string | null): Promise<{ suspicious: boolean; reason?: string }> {
    if (!comment) return { suspicious: false };

    const recentByUser = await prisma.review.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      select: { comment: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (recentByUser.length >= 5) {
      return { suspicious: true, reason: "5+ reviews posted within the last hour" };
    }

    const duplicate = recentByUser.find((r) => r.comment && r.comment.trim().toLowerCase() === comment.trim().toLowerCase());
    if (duplicate) {
      return { suspicious: true, reason: "Near-identical text to a review this user posted recently" };
    }

    return { suspicious: false };
  }

  static async createReview(params: { userId: string; productId: string; rating: number; comment?: string; qualityRating?: number; packagingRating?: number; deliveryRating?: number; priceRating?: number; mediaUrls?: { url: string; type: "IMAGE" | "VIDEO" }[] }) {
    const isVerifiedPurchase = await this.hasVerifiedPurchase(params.userId, params.productId);
    const spamCheck = await this.checkSpamSignals(params.userId, params.comment ?? null);

    const review = await prisma.review.create({
      data: {
        productId: params.productId,
        userId: params.userId,
        rating: params.rating,
        comment: params.comment,
        qualityRating: params.qualityRating,
        packagingRating: params.packagingRating,
        deliveryRating: params.deliveryRating,
        priceRating: params.priceRating,
        isVerifiedPurchase,
        status: spamCheck.suspicious ? "FLAGGED" : isVerifiedPurchase ? "APPROVED" : "PENDING",
        moderationNote: spamCheck.suspicious ? spamCheck.reason : null,
        media: params.mediaUrls ? { create: params.mediaUrls } : undefined,
      },
      include: { media: true },
    });

    return review;
  }

  static async toggleHelpfulVote(reviewId: string, userId: string) {
    const existing = await prisma.reviewVote.findUnique({ where: { reviewId_userId: { reviewId, userId } } });

    if (existing) {
      await prisma.$transaction([
        prisma.reviewVote.delete({ where: { id: existing.id } }),
        prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: { decrement: 1 } } }),
      ]);
      return { voted: false };
    }

    await prisma.$transaction([
      prisma.reviewVote.create({ data: { reviewId, userId } }),
      prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } }),
    ]);
    return { voted: true };
  }

  static async moderate(reviewId: string, status: "APPROVED" | "REJECTED", note?: string) {
    return prisma.review.update({ where: { id: reviewId }, data: { status, moderationNote: note } });
  }

  static async addReply(reviewId: string, authorUserId: string, authorLabel: string, content: string) {
    return prisma.reviewReply.create({ data: { reviewId, authorUserId, authorLabel, content } });
  }
}
