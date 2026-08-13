import { prisma } from "@/lib/prisma";
import type { BillingCycle } from "@prisma/client";
import { NotificationService } from "@/lib/notifications/service";
import { logger } from "@/lib/logger";
import { AnalyticsService } from "@/lib/services/analytics-service";

/**
 * MembershipService — Phase 4.4
 *
 * Every membership operation (subscribe, cancel, upgrade, expiry checks,
 * savings reporting) goes through here — nothing about plans, pricing, or
 * membership state is scattered across routes/pages. Benefit *logic*
 * (what a benefit actually does) lives in BenefitEngine
 * (src/lib/services/benefit-engine.ts); this service only manages the
 * membership record's lifecycle.
 */

const membershipInclude = {
  plan: { include: { benefits: true } },
  pricingOption: true,
} as const;

function cycleDurationMs(cycle: BillingCycle): number {
  const DAY = 24 * 60 * 60 * 1000;
  return cycle === "YEARLY" ? 365 * DAY : 30 * DAY;
}

export class MembershipService {
  /** All plans available for purchase, each with its pricing options and benefits — the public pricing page's data source. */
  static async getActivePlans() {
    return prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        pricingOptions: { where: { isActive: true }, orderBy: { billingCycle: "asc" } },
        benefits: { where: { isEnabled: true } },
      },
    });
  }

  /**
   * Current membership for a user, or null. Lazily self-heals expiry: if
   * an ACTIVE membership's `endsAt` has passed, it's flipped to EXPIRED
   * here rather than requiring a separate cron job for this to matter to
   * the app's behavior (a real scheduled job would do this proactively
   * for billing purposes, but read-time correctness doesn't depend on it).
   */
  static async getUserMembership(userId: string) {
    const membership = await prisma.membership.findUnique({
      where: { userId },
      include: membershipInclude,
    });
    if (!membership) return null;

    if (membership.status === "ACTIVE" && membership.endsAt < new Date()) {
      return prisma.membership.update({
        where: { userId },
        data: { status: "EXPIRED" },
        include: membershipInclude,
      });
    }
    return membership;
  }

  /** True only for a currently-ACTIVE, non-expired membership. */
  static async isActiveMember(userId: string): Promise<boolean> {
    const m = await this.getUserMembership(userId);
    return !!m && m.status === "ACTIVE" && m.endsAt > new Date();
  }

  /** New subscription, or re-subscribing after a cancellation/expiry. */
  static async subscribe(params: { userId: string; planId: string; pricingOptionId: string }) {
    const pricingOption = await prisma.membershipPricingOption.findUniqueOrThrow({
      where: { id: params.pricingOptionId },
    });
    if (pricingOption.planId !== params.planId) {
      throw new Error("PRICING_OPTION_PLAN_MISMATCH");
    }

    const endsAt = new Date(Date.now() + cycleDurationMs(pricingOption.billingCycle));

    const membership = await prisma.membership.upsert({
      where: { userId: params.userId },
      update: {
        planId: params.planId,
        pricingOptionId: params.pricingOptionId,
        status: "ACTIVE",
        startsAt: new Date(),
        endsAt,
        autoRenew: true,
        cancelledAt: null,
      },
      create: {
        userId: params.userId,
        planId: params.planId,
        pricingOptionId: params.pricingOptionId,
        status: "ACTIVE",
        endsAt,
      },
      include: membershipInclude,
    });

    NotificationService.dispatch({
      type: "MEMBERSHIP_ACTIVATED",
      recipientUserId: params.userId,
      data: { planName: membership.plan.name, billingCycle: membership.pricingOption.billingCycle, endsAt: membership.endsAt },
    });

    // Analytics event (Phase 5 review finding: this was previously
    // untracked anywhere — every other purchase-type event in the app
    // has an analytics entry, membership subscriptions didn't).
    logger.info("Membership Purchased", {
      userId: params.userId,
      planId: params.planId,
      planName: membership.plan.name,
      billingCycle: membership.pricingOption.billingCycle,
      price: Number(membership.pricingOption.price),
    });
    AnalyticsService.track({
      type: "MEMBERSHIP_PURCHASE",
      sessionId: params.userId,
      userId: params.userId,
      metadata: { planId: params.planId, price: Number(membership.pricingOption.price) },
    });

    return membership;
  }

  /** Switch plan/cycle for an existing member — takes effect immediately (no proration in this version). */
  static async upgrade(params: { userId: string; planId: string; pricingOptionId: string }) {
    return this.subscribe(params);
  }

  /**
   * Standard SaaS cancel: stop auto-renew, but the member keeps their
   * benefits until `endsAt` (they already paid for that period). A
   * scheduled renewal job would otherwise have billed them again at
   * `endsAt` — this just skips that.
   */
  static async cancel(userId: string) {
    return prisma.membership.update({
      where: { userId },
      data: { autoRenew: false, cancelledAt: new Date() },
      include: membershipInclude,
    });
  }

  /**
   * Real savings, not a projected/estimated number — sums `Order.discountTotal`
   * for orders this member actually placed while a member
   * (`isMembershipOrder = true`, set at checkout time).
   */
  static async getSavings(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [monthAgg, lifetimeAgg] = await Promise.all([
      prisma.order.aggregate({
        where: { userId, isMembershipOrder: true, createdAt: { gte: startOfMonth } },
        _sum: { discountTotal: true },
      }),
      prisma.order.aggregate({
        where: { userId, isMembershipOrder: true },
        _sum: { discountTotal: true },
      }),
    ]);

    return {
      savingsThisMonth: Number(monthAgg._sum.discountTotal ?? 0),
      savingsLifetime: Number(lifetimeAgg._sum.discountTotal ?? 0),
    };
  }

  // -------------------------------------------------------------------
  // Members Only product visibility
  // -------------------------------------------------------------------

  /**
   * Prisma `where` fragment to spread into any product listing query.
   * Active members see everything; everyone else never sees
   * `isMembersOnly` products at all (not just gated at checkout — they
   * don't appear in listings, search, or category pages).
   */
  static async getVisibilityFilter(userId?: string | null) {
    const isMember = userId ? await this.isActiveMember(userId) : false;
    return isMember ? {} : { isMembersOnly: false };
  }

  // -------------------------------------------------------------------
  // Admin-facing queries
  // -------------------------------------------------------------------

  static async getActiveMembers(page = 1, pageSize = 25) {
    const where = { status: "ACTIVE" as const };
    const [members, total] = await Promise.all([
      prisma.membership.findMany({
        where,
        include: { user: { select: { name: true, email: true } }, plan: true, pricingOption: true },
        orderBy: { startsAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.membership.count({ where }),
    ]);
    return { members, total };
  }

  static async getExpiredMembers(page = 1, pageSize = 25) {
    const expiredStatuses: ("EXPIRED" | "CANCELLED")[] = ["EXPIRED", "CANCELLED"];
    const where = { status: { in: expiredStatuses } };
    const [members, total] = await Promise.all([
      prisma.membership.findMany({
        where,
        include: { user: { select: { name: true, email: true } }, plan: true, pricingOption: true },
        orderBy: { endsAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.membership.count({ where }),
    ]);
    return { members, total };
  }
}
