import { cache } from "react";
import { FeatureFlagService } from "@/lib/services/feature-flag-service";

/**
 * Saveo Launch Mode — real, live-toggleable feature flags.
 *
 * This used to be a static hardcoded object (edit the file, redeploy to
 * change). That didn't match the real need: an admin needs a live
 * on/off switch for these feature areas without a code change. This
 * now reads from the same FeatureFlag table the Beta Command Center
 * already manages — see /admin/beta-center — using the fail-CLOSED
 * variant (an unseeded flag defaults to false), unlike the older
 * operational flags which fail open. Nothing is deleted to support
 * this: every gated feature's models, API routes, and components stay
 * fully intact, exactly as before.
 *
 * Site-wide performance pass: `getLaunchFlags()` is called once in the
 * root [locale] layout AND independently by several pages (Discover,
 * Mystery Boxes, PDP) that need it before deciding what to render —
 * that's correct, each needs its own copy of the result, not a
 * refactor to pass it down as a prop through every route. What WAS a
 * real duplicate cost: every call re-ran 7 separate `findUnique`
 * queries with zero caching, so a single page load doing both (layout
 * + page) fired 14 round-trips for data that's identical within one
 * request. Fixed two ways:
 * 1. `cache()` (React's per-request memoization, not a shared/global
 *    cache — safe, no cross-user leakage) — the layout's call and a
 *    page's call for the same request now share one result.
 * 2. The 7 `findUnique` calls collapse into a single `findMany`.
 */
export interface LaunchFeatureFlags {
  SAVE_AI_ENABLED: boolean;
  ADVANCED_RECOMMENDATIONS_ENABLED: boolean;
  MYSTERY_BOX_ENABLED: boolean;
  SAVEO_PLUS_ENABLED: boolean;
  GAMIFICATION_ENABLED: boolean;
  ADVANCED_DEAL_OF_HOUR_ENABLED: boolean;
  SMART_CROSS_SELLING_ENABLED: boolean;
}

const LAUNCH_FLAG_KEYS: (keyof LaunchFeatureFlags)[] = [
  "SAVE_AI_ENABLED",
  "ADVANCED_RECOMMENDATIONS_ENABLED",
  "MYSTERY_BOX_ENABLED",
  "SAVEO_PLUS_ENABLED",
  "GAMIFICATION_ENABLED",
  "ADVANCED_DEAL_OF_HOUR_ENABLED",
  "SMART_CROSS_SELLING_ENABLED",
];

/** Fetches all 7 launch flags in one batch — use this at the top of a page/layout rather than calling isLaunchFeatureEnabled() repeatedly. Memoized per-request: safe to call from both the layout and a page without doing the work twice. */
export const getLaunchFlags = cache(async (): Promise<LaunchFeatureFlags> => {
  return FeatureFlagService.getAllFailClosed(LAUNCH_FLAG_KEYS as any);
});

/** Single-flag check, for the common case of gating one small render path. Memoized per-request per key. */
export const isLaunchFeatureEnabled = cache(async (key: keyof LaunchFeatureFlags): Promise<boolean> => {
  return FeatureFlagService.isEnabledFailClosed(key as any);
});
