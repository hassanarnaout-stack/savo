# Saveo Data Warehouse

**Additive-only pre-computation layer.** Turns "20+ Prisma queries per request" into "a handful of bulk queries during refresh, then instant cached reads." Zero Prisma Schema changes. Zero existing code touched. Nothing in this directory is imported by any existing page, route, or service — it is genuinely safe to delete this whole folder with zero effect on the rest of the platform.

## Architecture

```
data-warehouse/
├── types.ts                  Shared summary shapes (the 8 contracts below)
├── customer-summary.ts       buildCustomerSummaries() / getCustomerSummary()
├── product-summary.ts        buildProductSummaries() / getProductSummary()
├── brand-summary.ts          buildBrandSummaries() / getBrandSummary()
├── supplier-summary.ts       buildSupplierSummaries() / getSupplierSummary()
├── category-summary.ts       buildCategorySummaries() / getCategorySummary()
├── campaign-summary.ts       buildCampaignSummaries() / getCampaignSummary()
├── order-summary.ts          buildOrderSummaries() / getOrderSummary()      (Daily/Weekly/Monthly)
├── revenue-summary.ts        buildRevenueSummaries() / getRevenueSummary() (Daily/Weekly/Monthly)
├── warehouse-cache.ts        In-memory store (see "Why no new table" below)
├── warehouse-service.ts      refreshWarehouse() — orchestrates all 8 builders
├── warehouse-health.ts       getWarehouseHealth() — real status from the last refresh
├── warehouse-validation.ts   validateAll() — real invariant checks on cached data
└── index.ts                  Single import point for everything above
```

## Why no new database table (and why that's correct here)

The brief forbids new Prisma models. The right additive-only way to hold "already computed, don't recompute on every read" data without a schema change is an in-process `Map` (`warehouse-cache.ts`). This is the same pattern already used for `src/lib/rate-limit.ts` in this codebase.

**Honest limitation**: this cache is per-process. On a multi-instance deployment, each instance builds its own copy independently. Fine today (single instance); the fix later is swapping the `Map` for Redis inside `warehouse-cache.ts` without touching any caller.

## Financial definitions — reused, not reinvented

`revenue-summary.ts` and every `grossSales`/`realizedSales`/`commission` field elsewhere use the **exact same convention** as the existing `BIAggregationService`:

- **GMV / grossSales** = `sum(SupplierTransaction.saleAmount)` where `status != REVERSED`
- **Realized / realizedSales** = `sum(saleAmount)` where `status IN (COMPLETED, SETTLED)`
- **Commission** = `sum(commissionAmount)` under the same realized-status filter
- **Period boundaries** are copied verbatim from `BIAggregationService`, not reimplemented.

Verified by reading `bi-aggregation-service.ts` directly before writing `revenue-summary.ts`.

## Every genuinely-null field, and why

| Field | Why it's null |
|---|---|
| `ProductSummary.conversionRate` | Needs view-level AND purchase-level tracking on the same session — not tied together in the schema. |
| `ProductSummary.cancellationRate` | No cancellation tracking separate from returns at the per-product level. |
| `BrandSummary.returnRate` | Needs a real per-brand return join, not built in this pass. |
| `SupplierSummary.returnRate` | Same reason, at the supplier level. |
| `CategorySummary.returnRate` | Same reason, at the category level. |
| `CampaignSummary.clicks` | `CampaignEventType` has no `CLICK` value. |
| `CampaignSummary.cartAdds` | No cart-add event type exists. |
| `CampaignSummary.revenue` | `CampaignEvent` has no linked order/amount field. |
| `CampaignSummary.roi` | No per-campaign cost figure tracked anywhere. |

## Known approximation (documented, not hidden)

`CustomerSummary.membershipValue`: `Order.discountTotal` combines coupon + membership discount together, with no isolated membership-only figure available in the schema. Can slightly overstate on orders that also used a coupon.

## Pre-Computation strategy

Every builder uses bulk queries (`findMany`/`groupBy`/`aggregate` covering every record at once), aggregated in memory with `Map`s — never a query-per-entity loop.

## Refresh strategy

**Full Refresh** (`refreshWarehouse()`) is the only strategy built in this phase. Each builder is isolated in try/catch — one failing doesn't stop or corrupt the others.

**Incremental Refresh is intentionally NOT built.** No event/webhook infrastructure exists today to reliably announce "customer X's data just changed" — order creation, review approval, returns, and wallet changes all happen through different code paths with no unified change-event bus. Building it without that would either miss derived changes or secretly just be Full Refresh wearing a different name. What's needed first: a real domain-event system (e.g. an `emitDataWarehouseInvalidation(type, id)` call at actual mutation sites).

## Failure safety

A single builder throwing during `refreshWarehouse()` is caught and recorded in the report — it does not clear that type's existing cache, and does not affect the other 7 builders. Verify via `getWarehouseHealth().status === "DEGRADED"` plus `failedAggregations`.

## Data validation

`warehouse-validation.ts` checks real structural invariants: negative revenue, mismatched totals, duplicate aggregation, commission mismatch, `saveoRevenue` diverging from `commissions`.

## Integration status

**Nothing in this directory is called by any existing page, route, or the Intelligence Core.** This phase is structure only, per the brief.

## Honest testing limitation

This sandbox has no live database connection and is network-blocked from Prisma's binary CDN (`403 Forbidden` on `prisma generate`, same constraint as the Intelligence Core phase). Not measurable here: real query counts/timing against a live DB, memory usage, large-dataset simulation. What was done instead: every Prisma call across all 8 builders manually cross-checked field-by-field against the real `schema.prisma` text. What to run for real numbers: `npx tsc --noEmit`, `npm run build`, then call `refreshWarehouse()` once and inspect the returned report (it contains real `durationMs`/`queryCount` per type) and `getWarehouseHealth()`.
