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

  static async attributeOrder(referralCode: string, orderId: string, orderSubtotal: number): Promise<{ affiliateId: string; commissionAmount: number } | null> {
    if (!(await FeatureFlagService.isEnabled("affiliate_program"))) return null;

    const affiliate = await prisma.affiliateAccount.findUnique({ where: { referralCode: referralCode.toUpperCase() } });
    if (!affiliate || affiliate.status !== "ACTIVE") return null;

    const existing = await prisma.affiliateReferral.findUnique({ where: { orderId } });
    if (existing) return null;

    const commissionAmount = Number((orderSubtotal * (affiliate.commissionRate / 100)).toFixed(3));

    await prisma.affiliateReferral.create({
      data: { affiliateId: affiliate.id, orderId, orderSubtotal, commissionAmount, status: "PENDING" },
    });

    return { affiliateId: affiliate.id, commissionAmount };
  }

  static async confirmReferralOnDelivery(orderId: string) {
    const referral = await prisma.affiliateReferral.findUnique({ where: { orderId } });
    if (!referral || referral.status !== "PENDING") return;

    await prisma.$transaction([
      prisma.affiliateReferral.update({ where: { id: referral.id }, data: { status: "CONFIRMED", confirmedAt: new Date() } }),
      prisma.affiliateAccount.update({ where: { id: referral.affiliateId }, data: { totalEarned: { increment: referral.commissionAmount } } }),
    ]);

    await this.checkAndAwardMilestones(referral.affiliateId);
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

  static async voidReferral(orderId: string) {
    const referral = await prisma.affiliateReferral.findUnique({ where: { orderId } });
    if (!referral || referral.status === "CANCELLED") return;

    const wasConfirmed = referral.status === "CONFIRMED";
    const ops: any[] = [prisma.affiliateReferral.update({ where: { id: referral.id }, data: { status: "CANCELLED" } })];
    if (wasConfirmed) {
      ops.push(prisma.affiliateAccount.update({ where: { id: referral.affiliateId }, data: { totalEarned: { decrement: referral.commissionAmount } } }));
    }
    await prisma.$transaction(ops);
  }

  static async getDashboard(affiliateId: string) {
    const [account, clickCount, referrals, milestones] = await Promise.all([
      prisma.affiliateAccount.findUniqueOrThrow({ where: { id: affiliateId } }),
      prisma.affiliateClick.count({ where: { affiliateId } }),
      prisma.affiliateReferral.findMany({ where: { affiliateId }, orderBy: { createdAt: "desc" }, take: 50, include: { order: { select: { orderNumber: true } } } }),
      prisma.affiliateMilestone.findMany({ where: { affiliateId } }),
    ]);

    const availableBalance = Number(account.totalEarned) - Number(account.totalWithdrawn);
    const confirmedReferrals = referrals.filter((r) => r.status === "CONFIRMED");
    const confirmedCount = confirmedReferrals.length;
    const pendingCount = referrals.filter((r) => r.status === "PENDING").length;
    const confirmedRevenue = confirmedReferrals.reduce((sum, r) => sum + Number(r.orderSubtotal), 0);

    return { account, clickCount, referrals, availableBalance, confirmedCount, pendingCount, confirmedRevenue, milestones };
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
