/**
 * WAREHOUSE SERVICE
 * ============================================================
 * Orchestrates the 8 summary builders. Provides refreshWarehouse()
 * as the single entry point for a Full Refresh.
 *
 * FAILURE SAFETY: if any one builder throws, refreshWarehouse()
 * catches it, records the failure, and leaves that summary type's
 * existing cached data untouched rather than wiping it.
 *
 * REFRESH STRATEGY: only Full Refresh is built here. Incremental
 * Refresh is NOT implemented — see README.md for why (no event
 * infrastructure exists today to know "which specific record
 * changed" without re-scanning).
 * ============================================================
 */
import { buildCustomerSummaries } from "./customer-summary";
import { buildProductSummaries } from "./product-summary";
import { buildBrandSummaries } from "./brand-summary";
import { buildSupplierSummaries } from "./supplier-summary";
import { buildCategorySummaries } from "./category-summary";
import { buildCampaignSummaries } from "./campaign-summary";
import { buildOrderSummaries } from "./order-summary";
import { buildRevenueSummaries } from "./revenue-summary";
import { BuildStats } from "./types";

export interface RefreshResult {
  type: string;
  success: boolean;
  stats: BuildStats | null;
  error: string | null;
}

export interface FullRefreshReport {
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  results: RefreshResult[];
  allSucceeded: boolean;
}

const BUILDERS: { type: string; run: () => Promise<{ summaries: unknown[]; stats: BuildStats }> }[] = [
  { type: "customer", run: buildCustomerSummaries },
  { type: "product", run: buildProductSummaries },
  { type: "brand", run: buildBrandSummaries },
  { type: "supplier", run: buildSupplierSummaries },
  { type: "category", run: buildCategorySummaries },
  { type: "campaign", run: buildCampaignSummaries },
  { type: "order", run: buildOrderSummaries },
  { type: "revenue", run: buildRevenueSummaries },
];

let lastRefreshReport: FullRefreshReport | null = null;

export async function refreshWarehouse(): Promise<FullRefreshReport> {
  const startedAt = new Date().toISOString();
  const overallStart = Date.now();
  const results: RefreshResult[] = [];

  for (const builder of BUILDERS) {
    try {
      const { stats } = await builder.run();
      results.push({ type: builder.type, success: true, stats, error: null });
    } catch (err) {
      results.push({
        type: builder.type,
        success: false,
        stats: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const report: FullRefreshReport = {
    startedAt,
    finishedAt: new Date().toISOString(),
    totalDurationMs: Date.now() - overallStart,
    results,
    allSucceeded: results.every((r) => r.success),
  };

  lastRefreshReport = report;
  return report;
}

export function getLastRefreshReport(): FullRefreshReport | null {
  return lastRefreshReport;
}
