import { prisma } from "@/lib/prisma";

/**
 * ChallengeProgressService — Phase 5.4 §10
 *
 * Called from checkout after a real purchase. Only evaluates challenges
 * currently within their live time window, and only counts genuinely
 * purchased items from THIS order — never trusts a client claim of
 * "I completed this challenge".
 */
export class ChallengeProgressService {
  static async updateProgressForOrder(userId: string, purchasedProductIds: string[], orderTotal: number) {
    const now = new Date();
    const liveChallenges = await prisma.brandChallenge.findMany({
      where: { startAt: { lte: now }, endAt: { gt: now } },
    });

    for (const challenge of liveChallenges) {
      const rules = challenge.rules as any;
      const requiredCount = rules.requiredProductCount ?? null;

      let matchingCount = purchasedProductIds.length;
      if (rules.categoryId) {
        matchingCount = await prisma.product.count({ where: { id: { in: purchasedProductIds }, categoryId: rules.categoryId } });
      }
      if (matchingCount === 0) continue;

      const existing = await prisma.challengeProgress.findUnique({
        where: { challengeId_userId: { challengeId: challenge.id, userId } },
      });

      const previousCount = existing ? ((existing.progress as any)?.productsPurchased ?? 0) : 0;
      const previousSpend = existing ? ((existing.progress as any)?.spend ?? 0) : 0;
      const newCount = previousCount + matchingCount;
      const newSpend = previousSpend + orderTotal;

      const isComplete = requiredCount ? newCount >= requiredCount : rules.minSpend ? newSpend >= rules.minSpend : false;

      await prisma.challengeProgress.upsert({
        where: { challengeId_userId: { challengeId: challenge.id, userId } },
        create: {
          challengeId: challenge.id,
          userId,
          progress: { productsPurchased: newCount, spend: newSpend },
          completedAt: isComplete ? now : null,
        },
        update: {
          progress: { productsPurchased: newCount, spend: newSpend },
          completedAt: isComplete && !existing?.completedAt ? now : existing?.completedAt,
        },
      });
    }
  }
}
