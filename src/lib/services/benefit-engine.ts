import type { Membership, MembershipPlan, MembershipPlanBenefit, MembershipBenefitKey } from "@prisma/client";

/**
 * BenefitEngine — Phase 4.4
 *
 * MembershipService manages WHETHER someone is a member. BenefitEngine
 * answers WHAT that membership actually grants them — kept separate so
 * "what does EXTRA_DISCOUNT mean" is defined exactly once, instead of
 * being reimplemented (and potentially drifting) in checkout, the PDP,
 * the header badge, and the dashboard independently.
 */

export type MembershipWithBenefits = Membership & {
  plan: MembershipPlan & { benefits: MembershipPlanBenefit[] };
};

export class BenefitEngine {
  private static getBenefit(
    membership: MembershipWithBenefits | null | undefined,
    key: MembershipBenefitKey
  ): MembershipPlanBenefit | null {
    if (!membership || membership.status !== "ACTIVE" || membership.endsAt < new Date()) return null;
    const benefit = membership.plan.benefits.find((b) => b.key === key);
    return benefit?.isEnabled ? benefit : null;
  }

  static hasBenefit(membership: MembershipWithBenefits | null | undefined, key: MembershipBenefitKey): boolean {
    return !!this.getBenefit(membership, key);
  }

  /** Percentage (0-100) of extra discount this membership grants on order subtotal, or 0. */
  static getExtraDiscountPercent(membership: MembershipWithBenefits | null | undefined): number {
    const benefit = this.getBenefit(membership, "EXTRA_DISCOUNT");
    return benefit?.value ? Number(benefit.value) : 0;
  }

  /** KWD amount saved on a given subtotal via the EXTRA_DISCOUNT benefit. */
  static calculateExtraDiscount(membership: MembershipWithBenefits | null | undefined, subtotal: number): number {
    const pct = this.getExtraDiscountPercent(membership);
    return pct > 0 ? Number(((subtotal * pct) / 100).toFixed(3)) : 0;
  }

  static hasFreeDelivery(membership: MembershipWithBenefits | null | undefined): boolean {
    return this.hasBenefit(membership, "FREE_DELIVERY");
  }

  static hasPlusBadge(membership: MembershipWithBenefits | null | undefined): boolean {
    return this.hasBenefit(membership, "PLUS_BADGE");
  }

  static canAccessExclusiveDeals(membership: MembershipWithBenefits | null | undefined): boolean {
    return this.hasBenefit(membership, "EXCLUSIVE_DEALS");
  }

  static hasEarlyAccess(membership: MembershipWithBenefits | null | undefined): boolean {
    return this.hasBenefit(membership, "EARLY_ACCESS");
  }

  /** Extra guaranteed-value uplift (KWD) applied to mystery box minimum value display, or 0. */
  static getMysteryBoxBonus(membership: MembershipWithBenefits | null | undefined): number {
    const benefit = this.getBenefit(membership, "MYSTERY_BOX_BONUS");
    return benefit?.value ? Number(benefit.value) : 0;
  }

  /**
   * Hook only — no reward-points system exists yet. Returns the
   * configured multiplier (e.g. 2 for "double points") so a future points
   * system can read it without any membership-side changes.
   */
  static getRewardPointsMultiplier(membership: MembershipWithBenefits | null | undefined): number {
    const benefit = this.getBenefit(membership, "DOUBLE_REWARD_POINTS");
    return benefit ? Number(benefit.value ?? 2) : 1;
  }

  /** Human-readable list of this plan's active benefits, for the pricing page / dashboard. */
  static listActiveBenefits(membership: MembershipWithBenefits | null | undefined, locale: "en" | "ar" = "en") {
    if (!membership) return [];
    return membership.plan.benefits
      .filter((b) => b.isEnabled)
      .map((b) => ({
        key: b.key,
        label: (locale === "ar" ? b.labelAr : b.label) ?? DEFAULT_LABELS[locale][b.key],
        value: b.value ? Number(b.value) : null,
      }));
  }
}

const DEFAULT_LABELS: Record<"en" | "ar", Record<MembershipBenefitKey, string>> = {
  en: {
    EXTRA_DISCOUNT: "Extra discount on every order",
    EARLY_ACCESS: "Early access to new deals",
    EXCLUSIVE_DEALS: "Access to members-only products",
    FREE_DELIVERY: "Free delivery on every order",
    PLUS_BADGE: "Saveo Plus badge",
    MYSTERY_BOX_BONUS: "Mystery Box value bonus",
    DOUBLE_REWARD_POINTS: "Double reward points",
  },
  ar: {
    EXTRA_DISCOUNT: "خصم إضافي على كل طلب",
    EARLY_ACCESS: "أولوية الوصول للعروض الجديدة",
    EXCLUSIVE_DEALS: "الوصول لمنتجات حصرية للأعضاء",
    FREE_DELIVERY: "توصيل مجاني على كل طلب",
    PLUS_BADGE: "شارة Saveo Plus",
    MYSTERY_BOX_BONUS: "قيمة إضافية بصناديق المفاجآت",
    DOUBLE_REWARD_POINTS: "نقاط مكافآت مضاعفة",
  },
};
