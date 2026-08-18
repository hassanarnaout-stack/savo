import { prisma } from "@/lib/prisma";

/**
 * Real Mystery Box tier data for the approved 2026 Figma experience.
 * Maps the existing MysteryBoxTier enum (BRONZE/SILVER/GOLD — kept
 * unchanged, zero schema change) to the approved customer-facing
 * naming (Discovery/Premium/Gold). A real box is only eligible for
 * the new interactive Build flow if it has a real CHOICE pool
 * configured (mysteryBoxChooseCount > 0) — boxes without one are
 * gracefully excluded rather than shown broken.
 */
export type MysteryTierKey = "discovery" | "premium" | "gold";

const TIER_TO_ENUM: Record<MysteryTierKey, "BRONZE" | "SILVER" | "GOLD"> = {
  discovery: "BRONZE",
  premium: "SILVER",
  gold: "GOLD",
};

export async function getMysteryBoxTierConfigs() {
  const boxes = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      type: "MYSTERY_BOX",
      mysteryBoxTier: { in: ["BRONZE", "SILVER", "GOLD"] },
      mysteryBoxChooseCount: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      nameAr: true,
      slug: true,
      saveoPrice: true,
      mysteryBoxTier: true,
      mysteryBoxLockedCount: true,
      mysteryBoxChooseCount: true,
      mysteryBoxValueMin: true,
      mysteryBoxValueMax: true,
      stockQty: true,
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      mysteryBoxContents: {
        where: { poolType: "CHOICE" },
        select: {
          possibleProduct: {
            select: { id: true, name: true, nameAr: true, brandName: true, slug: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });

  const byTier = new Map(boxes.map((b) => [b.mysteryBoxTier, b]));
  const tiers: Record<MysteryTierKey, ReturnType<typeof mapBox> | null> = {
    discovery: null,
    premium: null,
    gold: null,
  };
  (Object.keys(TIER_TO_ENUM) as MysteryTierKey[]).forEach((key) => {
    const box = byTier.get(TIER_TO_ENUM[key]);
    if (box) tiers[key] = mapBox(box, key);
  });
  return tiers;
}

function mapBox(box: any, tierKey: MysteryTierKey) {
  return {
    tierKey,
    id: box.id as string,
    name: box.name as string,
    nameAr: box.nameAr as string | null,
    slug: box.slug as string,
    price: Number(box.saveoPrice),
    image: box.images[0]?.url ?? null,
    mysteryCount: box.mysteryBoxLockedCount ?? 0,
    pickCount: box.mysteryBoxChooseCount ?? 0,
    poolSize: box.mysteryBoxContents.length,
    valueMin: box.mysteryBoxValueMin ? Number(box.mysteryBoxValueMin) : null,
    valueMax: box.mysteryBoxValueMax ? Number(box.mysteryBoxValueMax) : null,
    inStock: box.stockQty > 0,
    choicePool: box.mysteryBoxContents.map((c: any) => ({
      id: c.possibleProduct.id as string,
      name: c.possibleProduct.name as string,
      nameAr: c.possibleProduct.nameAr as string | null,
      brand: c.possibleProduct.brandName as string | null,
      slug: c.possibleProduct.slug as string,
      image: c.possibleProduct.images[0]?.url ?? null,
    })),
  };
}

export async function isGoldBoxEligible(userId: string | null | undefined) {
  if (!userId) return false;
  const { MembershipService } = await import("@/lib/services/membership-service");
  return MembershipService.isActiveMember(userId);
}
