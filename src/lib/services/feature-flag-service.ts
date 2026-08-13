import { prisma } from "@/lib/prisma";

/**
 * FeatureFlagService — Phase 5.2
 *
 * The canonical set of flags this phase asks for. `isEnabled()` defaults
 * to `true` for any flag not yet in the DB (fail-open — a missing row
 * should never silently disable a feature that was working before this
 * system existed). Seeded explicitly in prisma/seed.ts so the admin UI
 * has real rows to toggle from day one.
 */
export const FEATURE_FLAG_KEYS = [
  "mystery_boxes",
  "flash_deals",
  "saveo_plus",
  "recommendations",
  "brand_ads",
  "new_discovery_features",
  "affiliate_program",
  // Launch Mode flags (Phase: production launch prep) — these must fail
  // CLOSED (default false) if unseeded, the opposite of the flags above,
  // since a missing launch-flag row should never silently re-enable an
  // experimental feature area on launch day. See isEnabledFailClosed().
  "SAVE_AI_ENABLED",
  "ADVANCED_RECOMMENDATIONS_ENABLED",
  "MYSTERY_BOX_ENABLED",
  "SAVEO_PLUS_ENABLED",
  "GAMIFICATION_ENABLED",
  "ADVANCED_DEAL_OF_HOUR_ENABLED",
  "SMART_CROSS_SELLING_ENABLED",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export class FeatureFlagService {
  static async getAll() {
    return prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  }

  static async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    const flag = await prisma.featureFlag.findUnique({ where: { key } });
    return flag?.enabled ?? true; // fail-open: an unseeded flag never disables an existing feature
  }

  /** Fail-CLOSED variant, for Launch Mode flags — an unseeded row means the feature stays off, never silently re-enabled. */
  static async isEnabledFailClosed(key: FeatureFlagKey): Promise<boolean> {
    const flag = await prisma.featureFlag.findUnique({ where: { key } });
    return flag?.enabled ?? false;
  }

  static async setEnabled(key: FeatureFlagKey, enabled: boolean) {
    return prisma.featureFlag.upsert({
      where: { key },
      update: { enabled },
      create: { key, name: key, enabled },
    });
  }
}
