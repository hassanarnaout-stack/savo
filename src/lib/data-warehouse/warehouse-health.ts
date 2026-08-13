/**
 * WAREHOUSE HEALTH
 * ============================================================
 * Every field here is read from the real last refresh report and
 * the real cache state — nothing here is simulated.
 * ============================================================
 */
import { getLastRefreshReport } from "./warehouse-service";
import { warehouseCache } from "./warehouse-cache";
import { validateAll } from "./warehouse-validation";

export interface WarehouseHealth {
  status: "HEALTHY" | "DEGRADED" | "NEVER_REFRESHED";
  lastSuccessfulRefresh: string | null;
  duration: number | null;
  recordsProcessed: number;
  failedAggregations: string[];
  dataConsistency: "OK" | "ISSUES_FOUND" | "NOT_YET_VALIDATED";
  snapshotAgeMs: number | null;
  cacheEntryCount: number;
}

export function getWarehouseHealth(): WarehouseHealth {
  const report = getLastRefreshReport();

  if (!report) {
    return {
      status: "NEVER_REFRESHED",
      lastSuccessfulRefresh: null,
      duration: null,
      recordsProcessed: 0,
      failedAggregations: [],
      dataConsistency: "NOT_YET_VALIDATED",
      snapshotAgeMs: null,
      cacheEntryCount: warehouseCache.size(),
    };
  }

  const failedAggregations = report.results.filter((r) => !r.success).map((r) => r.type);
  const recordsProcessed = report.results.reduce((sum, r) => sum + (r.stats?.recordsProcessed ?? 0), 0);
  const snapshotAgeMs = Date.now() - new Date(report.finishedAt).getTime();
  const validation = validateAll();

  return {
    status: report.allSucceeded ? "HEALTHY" : "DEGRADED",
    lastSuccessfulRefresh: report.finishedAt,
    duration: report.totalDurationMs,
    recordsProcessed,
    failedAggregations,
    dataConsistency: validation.consistent ? "OK" : "ISSUES_FOUND",
    snapshotAgeMs,
    cacheEntryCount: warehouseCache.size(),
  };
}
