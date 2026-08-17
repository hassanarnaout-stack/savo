import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { GiftCardService } from "@/lib/services/gift-card-service";
import { FeatureFlagService } from "@/lib/services/feature-flag-service";

/**
 * AffiliateService — Phase 9.2
 *
 * Commission is only CONFIRMED when the referred order is actually
 * DELIVERED — never at placement, mirroring the same "commission on
 * delivery" principle used for supplier commissions elsewhere.
 */
function generateReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

export class AffiliateService {
  static async createAccount(userId: string) {
    const existing = await prisma.affiliateAccount.findUnique({ where: { userId } });
    if (existing) return existing;

    let referralCode = generateReferralCode();
    while (await prisma.affiliateAccount.findUnique({ where: { referralCode } })) {
      referralCode = generateReferralCode();
    }

    return prisma.affiliateAccount.create({ data: { userId, referralCode } });
  }

  static async recordClick(referralCode: string, landingPath: string, referrerUrl?: string) {
    if (!(await FeatureFlagService.isEnabled("affiliate_program"))) return null;

    const affiliate = await prisma.affiliateAccount.findUnique({ where: { referralCode: referralCode.toUpperCase() } });
    if (!affiliate || affiliate.status !== "ACTIVE") return null;

    await prisma.affiliateClick.create({ data: { affiliateId: affiliate.id, landingPath, referrerUrl } });
    return affiliate.id;
  }

  static async attributeOrder(
    referralCode: string,
    orderId: string,
    orderSubtotal: number,
    buyerUserId: string,
    orderItems: { productId: string; lineSubtotal: number }[]
  ): Promise<{ affiliateId: string; commissionAmount: number; boostCommissionAmount: number } | null> {
    if (!(await FeatureFlagService.isEnabled("affiliate_program"))) return null;

    const affiliate = await prisma.affiliateAccount.findUnique({ where: { referralCode: referralCode.toUpperCase() } });
    if (!affiliate || affiliate.status !== "ACTIVE") return null;

    // Self-referral protection (Discovery Partners V2 Phase 1). The order
    // itself already succeeded before this function runs (see checkout
    // route) — this only withholds AFFILIATE CREDIT, never the customer's
    // own purchase. Comparing the affiliate's own account owner against the
    // buyer is the safest identity check available: both are real User
    // rows behind real auth sessions, no new identity system invented.
    if (affiliate.userId === buyerUserId) return null;

    const existing = await prisma.affiliateReferral.findUnique({ where: { orderId } });
    if (existing) return null;

    const commissionAmount = Number((orderSubtotal * (affiliate.commissionRate / 100)).toFixed(3));

    const boost = await this.computeEligibleBoost(orderItems);

    await prisma.affiliateReferral.create({
      data: {
        affiliateId: affiliate.id,
        orderId,
        orderSubtotal,
        commissionAmount,
        status: "PENDING",
        boostCommissionAmount: boost.amount,
        boostCampaignId: boost.campaignId,
      },
    });

    return { affiliateId: affiliate.id, commissionAmount, boostCommissionAmount: boost.amount };
  }

  /**
   * Boost eligibility (Discovery Partners V2 Phase 1, Step 3). Only the
   * order lines whose product is actually enrolled in an active campaign
   * count toward the boost — an unrelated product in the same order never
   * contributes. If lines match more than one active campaign (unlikely
   * but possible), only the single highest-value match wins per line —
   * boosts never stack on the same line.
   */
  private static async computeEligibleBoost(orderItems: { productId: string; lineSubtotal: number }[]): Promise<{ amount: number; campaignId: string | null }> {
    if (orderItems.length === 0) return { amount: 0, campaignId: null };
    const now = new Date();

    const activeCampaigns = await prisma.affiliateBoostCampaign.findMany({
      where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
      include: { products: { select: { productId: true } } },
    });
    if (activeCampaigns.length === 0) return { amount: 0, campaignId: null };

    let bestCampaignId: string | null = null;
    let bestAmount = 0;

    for (const campaign of activeCampaigns) {
      const eligibleProductIds = new Set(campaign.products.map((p) => p.productId));
      const eligibleValue = orderItems.filter((it) => eligibleProductIds.has(it.productId)).reduce((sum, it) => sum + it.lineSubtotal, 0);
      if (eligibleValue <= 0) continue;
      const amount = Number((eligibleValue * (campaign.extraCommissionRate / 100)).toFixed(3));
      if (amount > bestAmount) {
        bestAmount = amount;
        bestCampaignId = campaign.id;
      }
    }

    return { amount: bestAmount, campaignId: bestCampaignId };
  }

  static async confirmReferralOnDelivery(orderId: string) {
    const referral = await prisma.affiliateReferral.findUnique({ where: { orderId } });
    if (!referral || referral.status !== "PENDING") return;

    // Budget is real economic cost — enforced here at CONFIRMATION time
    // (delivery), never at attribution/PENDING time, and never trusted
    // from a client. A single transaction re-reads the campaign's live
    // confirmedSpend and clamps the boost actually paid to whatever
    // budget remains — concurrency-safe against two orders confirming at
    // the same moment.
    await prisma.$transaction(async (tx) => {
      let boostToApply = Number(referral.boostCommissionAmount);

      if (referral.boostCampaignId && boostToApply > 0) {
        const campaign = await tx.affiliateBoostCampaign.findUnique({ where: { id: referral.boostCampaignId } });
        if (!campaign || !campaign.isActive) {
          boostToApply = 0;
        } else if (campaign.budget !== null) {
          const remaining = Number(campaign.budget) - Number(campaign.confirmedSpend);
          boostToApply = Math.max(0, Math.min(boostToApply, remaining));
        }
        if (boostToApply > 0) {
          await tx.affiliateBoostCampaign.update({ where: { id: campaign!.id }, data: { confirmedSpend: { increment: boostToApply } } });
        }
      }

      await tx.affiliateReferral.update({
        where: { id: referral.id },
        data: { status: "CONFIRMED", confirmedAt: new Date(), boostCommissionAmount: boostToApply },
      });
      await tx.affiliateAccount.update({
        where: { id: referral.affiliateId },
        data: { totalEarned: { increment: Number(referral.commissionAmount) + boostToApply } },
      });
    });

    await this.checkAndAwardMilestones(referral.affiliateId);
    await this.checkAndAwardMissions(referral.affiliateId);
  }

  /**
   * Real, automatic tiered rewards program — reads live rules from
   * AffiliateMilestoneRule (admin-editable), never a hardcoded list.
   * Checks the affiliate's ACTUAL confirmed referral count and total
   * confirmed referred revenue, and awards a real GiftCard + optional
   * commission-rate bump the first time each active rule's threshold
   * is crossed. The unique constraint on AffiliateMilestone makes
   * this idempotent — safe to call after every confirmation.
   */
  static async checkAndAwardMilestones(affiliateId: string) {
    const confirmedReferrals = await prisma.affiliateReferral.findMany({
      where: { affiliateId, status: "CONFIRMED" },
      select: { orderSubtotal: true },
    });
    const confirmedCount = confirmedReferrals.length;
    const confirmedRevenue = confirmedReferrals.reduce((sum, r) => sum + Number(r.orderSubtotal), 0);

    const account = await prisma.affiliateAccount.findUniqueOrThrow({ where: { id: affiliateId } });
    const activeRules = await prisma.affiliateMilestoneRule.findMany({ where: { isActive: true } });

    for (const rule of activeRules) {
      const progress = rule.metric === "REFERRAL_COUNT" ? confirmedCount : confirmedRevenue;
      if (progress < rule.threshold) continue;

      const alreadyAwarded = await prisma.affiliateMilestone.findUnique({ where: { affiliateId_ruleId: { affiliateId, ruleId: rule.id } } });
      if (alreadyAwarded) continue;

      let giftCardId: string | undefined;
      if (Number(rule.giftCardAmount) > 0) {
        const giftCard = await GiftCardService.issueRewardCard(Number(rule.giftCardAmount), account.userId, `Savo Affiliate milestone reward: ${rule.name}`);
        giftCardId = giftCard.id;
      }

      await prisma.affiliateMilestone.create({ data: { affiliateId, ruleId: rule.id, giftCardId } });

      // A rate bump only applies if it's actually higher than whatever the admin may have already set manually — never lowers a custom rate.
      if (rule.newCommissionRate && rule.newCommissionRate > account.commissionRate) {
        await prisma.affiliateAccount.update({ where: { id: affiliateId }, data: { commissionRate: rule.newCommissionRate } });
      }
    }
  }

  /**
   * Missions (Discovery Partners V2 Phase 1, Step 4) — temporary,
   * campaign-oriented objectives. Deliberately mirrors
   * checkAndAwardMilestones's exact philosophy: independent progress per
   * mission, checked against confirmed/delivered referrals only (never
   * clicks or pending orders), awarded once (idempotent via the
   * @@unique([affiliateId, missionId]) constraint), no stage/tier concept.
   * A separate function from milestones on purpose — missions are
   * time-boxed (startAt/endAt) and never touch AffiliateMilestoneRule.
   */
  static async checkAndAwardMissions(affiliateId: string) {
    const now = new Date();
    const activeMissions = await prisma.affiliateMission.findMany({
      where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
    });
    if (activeMissions.length === 0) return;

    const confirmedReferrals = await prisma.affiliateReferral.findMany({
      where: { affiliateId, status: "CONFIRMED" },
      select: { orderSubtotal: true },
    });
    const confirmedCount = confirmedReferrals.length;
    const confirmedRevenue = confirmedReferrals.reduce((sum, r) => sum + Number(r.orderSubtotal), 0);

    const account = await prisma.affiliateAccount.findUniqueOrThrow({ where: { id: affiliateId } });

    for (const mission of activeMissions) {
      const progress = mission.metric === "CONFIRMED_ORDER_COUNT" ? confirmedCount : confirmedRevenue;
      if (progress < mission.threshold) continue;

      const alreadyAwarded = await prisma.affiliateMissionAward.findUnique({ where: { affiliateId_missionId: { affiliateId, missionId: mission.id } } });
      if (alreadyAwarded) continue;

      let giftCardId: string | undefined;
      if (Number(mission.giftCardAmount) > 0) {
        const giftCard = await GiftCardService.issueRewardCard(Number(mission.giftCardAmount), account.userId, `Savo Affiliate mission reward: ${mission.nameEn}`);
        giftCardId = giftCard.id;
      }

      await prisma.affiliateMissionAward.create({ data: { affiliateId, missionId: mission.id, giftCardId } });

      if (mission.bonusCommissionRate && mission.bonusCommissionRate > account.commissionRate) {
        await prisma.affiliateAccount.update({ where: { id: affiliateId }, data: { commissionRate: mission.bonusCommissionRate } });
      }
    }
  }

  static async voidReferral(orderId: string) {
    const referral = await prisma.affiliateReferral.findUnique({ where: { orderId } });
    if (!referral || referral.status === "CANCELLED") return;

    const wasConfirmed = referral.status === "CONFIRMED";
    await prisma.$transaction(async (tx) => {
      await tx.affiliateReferral.update({ where: { id: referral.id }, data: { status: "CANCELLED" } });
      if (wasConfirmed) {
        const totalToReverse = Number(referral.commissionAmount) + Number(referral.boostCommissionAmount);
        await tx.affiliateAccount.update({ where: { id: referral.affiliateId }, data: { totalEarned: { decrement: totalToReverse } } });
        if (referral.boostCampaignId && Number(referral.boostCommissionAmount) > 0) {
          await tx.affiliateBoostCampaign.update({ where: { id: referral.boostCampaignId }, data: { confirmedSpend: { decrement: Number(referral.boostCommissionAmount) } } });
        }
      }
    });
  }

  static async getDashboard(affiliateId: string) {
    const now = new Date();
    const [account, clickCount, referrals, milestones, activeMissions, achievedMissionAwards, activeBoostCampaigns] = await Promise.all([
      prisma.affiliateAccount.findUniqueOrThrow({ where: { id: affiliateId } }),
      prisma.affiliateClick.count({ where: { affiliateId } }),
      prisma.affiliateReferral.findMany({ where: { affiliateId }, orderBy: { createdAt: "desc" }, take: 50, include: { order: { select: { orderNumber: true } }, boostCampaign: { select: { id: true, name: true } } } }),
      prisma.affiliateMilestone.findMany({ where: { affiliateId } }),
      prisma.affiliateMission.findMany({ where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } }, orderBy: { sortOrder: "asc" } }),
      prisma.affiliateMissionAward.findMany({ where: { affiliateId } }),
      prisma.affiliateBoostCampaign.findMany({
        where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
        select: { id: true, name: true, extraCommissionRate: true, endAt: true, products: { select: { product: { select: { id: true, name: true, slug: true } } } } },
      }),
    ]);

    const availableBalance = Number(account.totalEarned) - Number(account.totalWithdrawn);
    const confirmedReferrals = referrals.filter((r) => r.status === "CONFIRMED");
    const pendingReferrals = referrals.filter((r) => r.status === "PENDING");
    const confirmedCount = confirmedReferrals.length;
    const pendingCount = pendingReferrals.length;
    const confirmedRevenue = confirmedReferrals.reduce((sum, r) => sum + Number(r.orderSubtotal), 0);
    // Real, not fabricated — derived directly from real click and confirmed-order counts already tracked.
    const conversionRate = clickCount > 0 ? confirmedCount / clickCount : 0;
    const pendingCommission = pendingReferrals.reduce((sum, r) => sum + Number(r.commissionAmount) + Number(r.boostCommissionAmount), 0);
    const recentBoostEarnings = confirmedReferrals.filter((r) => Number(r.boostCommissionAmount) > 0);

    return {
      account,
      clickCount,
      referrals,
      availableBalance,
      confirmedCount,
      pendingCount,
      confirmedRevenue,
      milestones,
      conversionRate,
      pendingCommission,
      activeMissions,
      achievedMissionAwards,
      recentBoostEarnings,
      activeBoostCampaigns,
    };
  }

  static async requestWithdrawal(affiliateId: string, amount: number) {
    const account = await prisma.affiliateAccount.findUniqueOrThrow({ where: { id: affiliateId } });
    const availableBalance = Number(account.totalEarned) - Number(account.totalWithdrawn);

    if (amount <= 0 || amount > availableBalance) {
      throw new Error(`Requested amount exceeds available balance of ${availableBalance.toFixed(3)} KD.`);
    }

    const pendingWithdrawal = await prisma.affiliateWithdrawal.findFirst({ where: { affiliateId, status: "PENDING" } });
    if (pendingWithdrawal) throw new Error("You already have a pending withdrawal request.");

    return prisma.affiliateWithdrawal.create({ data: { affiliateId, amount } });
  }

  static async payWithdrawal(withdrawalId: string, referenceNumber: string) {
    const withdrawal = await prisma.affiliateWithdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    return prisma.$transaction([
      prisma.affiliateWithdrawal.update({ where: { id: withdrawalId }, data: { status: "PAID", referenceNumber, paidAt: new Date() } }),
      prisma.affiliateAccount.update({ where: { id: withdrawal.affiliateId }, data: { totalWithdrawn: { increment: withdrawal.amount } } }),
    ]);
  }

  static async rejectWithdrawal(withdrawalId: string, reason: string) {
    return prisma.affiliateWithdrawal.update({ where: { id: withdrawalId }, data: { status: "REJECTED", rejectionReason: reason } });
  }
}
