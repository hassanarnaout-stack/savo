import type { LaunchFeatureFlags } from "@/lib/launch-flags";

/**
 * Discover — Quick Ways In. Closed, code-defined list of destinations.
 * Admin picks a KEY from this list — never a free-form URL (per SAVO
 * Media/Content policy: no unsafe arbitrary links in admin-authored
 * content). Every href here is a real, verified production route.
 *
 * `requiresFlag` gates a destination behind the same launch flag the
 * route itself is already gated by (e.g. Mystery Boxes) — if the flag
 * is off, the shortcut is silently excluded even if an admin marked
 * it active, so Quick Ways In never links to a route that would 404
 * or redirect away.
 */
export interface QuickWayDestination {
  key: string;
  href: string;
  labelEn: string;
  labelAr: string;
  requiresFlag?: keyof LaunchFeatureFlags;
}

export const QUICK_WAY_DESTINATIONS: QuickWayDestination[] = [
  { key: "NEW_ARRIVALS", href: "/products?sort=newest", labelEn: "New Arrivals", labelAr: "وصل حديثاً" },
  { key: "MYSTERY_BOXES", href: "/mystery-boxes", labelEn: "Mystery Boxes", labelAr: "صناديق المفاجآت", requiresFlag: "MYSTERY_BOX_ENABLED" },
  { key: "BROWSE_BRANDS", href: "/brands", labelEn: "Browse by Brand", labelAr: "تصفح حسب الماركة" },
  { key: "EDITORS_PICKS", href: "/products?badge=EDITORS_PICK", labelEn: "Editor's Picks", labelAr: "اختيار المحرر" },
  { key: "SAVO_PLUS", href: "/products?membersOnly=true", labelEn: "SAVO Plus Exclusive", labelAr: "Savo Plus حصرياً" },
  { key: "FLASH_SALE", href: "/products?type=DEAL", labelEn: "Flash Sale", labelAr: "عروض فلاش" },
  { key: "LIMITED_EDITION", href: "/products?badge=LIMITED", labelEn: "Limited Edition", labelAr: "إصدار محدود" },
  { key: "TREASURE_HUNT", href: "/treasure-map", labelEn: "Treasure Hunt", labelAr: "رحلة الكنز", requiresFlag: "GAMIFICATION_ENABLED" },
  { key: "CURATED_COLLECTIONS", href: "/collections", labelEn: "Curated Collections", labelAr: "تجميعات منتقاة" },
];

export const QUICK_WAY_DESTINATION_KEYS = QUICK_WAY_DESTINATIONS.map((d) => d.key);

export function getQuickWayDestination(key: string): QuickWayDestination | undefined {
  return QUICK_WAY_DESTINATIONS.find((d) => d.key === key);
}
