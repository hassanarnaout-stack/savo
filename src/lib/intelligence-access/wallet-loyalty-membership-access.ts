/**
 * WALLET / LOYALTY / MEMBERSHIP ACCESS
 * ============================================================
 * Deliberately reads live from the database, not from the Data
 * Warehouse cache — real financial balances must always be
 * current, never up-to-60-seconds-stale.
 * ============================================================
 */
import { prisma } from "@/lib/prisma";
import { assertOwnership } from "./security";
import { WalletData, LoyaltyData, MembershipData, DataFreshness } from "./types";

function liveFreshness(source: DataFreshness["source"]): DataFreshness {
  return { source, generatedAt: new Date().toISOString(), dataAgeMs: 0 };
}

export async function getWalletData(customerId: string, requestingUserId: string | null): Promise<WalletData> {
  assertOwnership(requestingUserId, customerId, "wallet data");

  const wallet = await prisma.saveoWallet.findUnique({ where: { userId: customerId }, select: { balance: true } });

  return {
    customerId,
    balance: wallet ? Number(wallet.balance) : 0,
    freshness: liveFreshness("WALLET_DATA"),
  };
}

export async function getLoyaltyData(customerId: string, requestingUserId: string | null): Promise<LoyaltyData> {
  assertOwnership(requestingUserId, customerId, "loyalty data");

  const points = await prisma.saveoPoints.findUnique({ where: { userId: customerId }, select: { points: true, lifetimePoints: true } });

  return {
    customerId,
    pointsBalance: points?.points ?? 0,
    lifetimePoints: points?.lifetimePoints ?? 0,
    freshness: liveFreshness("LOYALTY_DATA"),
  };
}

export async function getMembershipData(customerId: string, requestingUserId: string | null): Promise<MembershipData> {
  assertOwnership(requestingUserId, customerId, "membership data");

  const membership = await prisma.membership.findUnique({
    where: { userId: customerId },
    select: { status: true, plan: { select: { name: true, benefits: { select: { key: true, isEnabled: true, value: true } } } } },
  });

  if (!membership) {
    return { customerId, status: null, tier: null, freeDeliveryEligible: false, extraDiscountPercent: null, freshness: liveFreshness("MEMBERSHIP_DATA") };
  }

  const freeDeliveryBenefit = membership.plan.benefits.find((b) => b.key === "FREE_DELIVERY" && b.isEnabled);
  const discountBenefit = membership.plan.benefits.find((b) => b.key === "EXTRA_DISCOUNT" && b.isEnabled);

  return {
    customerId,
    status: membership.status,
    tier: membership.plan.name,
    freeDeliveryEligible: membership.status === "ACTIVE" && !!freeDeliveryBenefit,
    extraDiscountPercent: membership.status === "ACTIVE" && discountBenefit?.value ? Number(discountBenefit.value) : null,
    freshness: liveFreshness("MEMBERSHIP_DATA"),
  };
}
