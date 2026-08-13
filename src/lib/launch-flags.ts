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

/** Fetches all 7 launch flags in one batch — use this at the top of a page/layout rather than calling isLaunchFeatureEnabled() repeatedly. */
export async function getLaunchFlags(): Promise<LaunchFeatureFlags> {
  const results = await Promise.all(LAUNCH_FLAG_KEYS.map((key) => FeatureFlagService.isEnabledFailClosed(key as any)));
  const flags = {} as LaunchFeatureFlags;
  LAUNCH_FLAG_KEYS.forEach((key, i) => {
    flags[key] = results[i];
  });
  return flags;
}

/** Single-flag check, for the common case of gating one small render path. */
export async function isLaunchFeatureEnabled(key: keyof LaunchFeatureFlags): Promise<boolean> {
  return FeatureFlagService.isEnabledFailClosed(key as any);
}
