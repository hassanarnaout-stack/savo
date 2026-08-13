/**
 * WAREHOUSE VALIDATION SERVICE
 * ============================================================
 * Real sanity checks against real invariants that must always
 * hold if the aggregation logic is correct.
 * ============================================================
 */
import { warehouseCache } from "./warehouse-cache";
import { CustomerSummary, ProductSummary, SupplierSummary, RevenueSummaryPeriod } from "./types";

export interface ValidationIssue {
  type: string;
  id: string;
  issue: string;
}

export function validateCustomerSummaries(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const key of warehouseCache.keysWithPrefix("customer:")) {
    const s = warehouseCache.get<CustomerSummary>(key);
    if (!s) continue;

    if (seen.has(s.customerId)) issues.push({ type: "customer", id: s.customerId, issue: "duplicate aggregation — same customerId cached under multiple keys" });
    seen.add(s.customerId);

    if (s.totalSpent < 0) issues.push({ type: "customer", id: s.customerId, issue: `negative totalSpent: ${s.totalSpent}` });
    if (s.completedOrders + s.cancelledOrders > s.totalOrders) {
      issues.push({ type: "customer", id: s.customerId, issue: `mismatched totals: completed(${s.completedOrders}) + cancelled(${s.cancelledOrders}) > total(${s.totalOrders})` });
    }
    if (s.customerScore < 0 || s.customerScore > 100) issues.push({ type: "customer", id: s.customerId, issue: `customerScore out of 0-100 range: ${s.customerScore}` });
  }

  return issues;
}

export function validateProductSummaries(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const key of warehouseCache.keysWithPrefix("product:")) {
    const s = warehouseCache.get<ProductSummary>(key);
    if (!s) continue;

    if (s.revenue < 0) issues.push({ type: "product", id: s.productId, issue: `negative revenue: ${s.revenue}` });
    if (s.returnRate !== null && (s.returnRate < 0 || s.returnRate > 1)) {
      issues.push({ type: "product", id: s.productId, issue: `returnRate out of 0-1 range: ${s.returnRate}` });
    }
    if (s.averageRating !== null && (s.averageRating < 1 || s.averageRating > 5)) {
      issues.push({ type: "product", id: s.productId, issue: `averageRating out of 1-5 range: ${s.averageRating}` });
    }
  }
  return issues;
}

export function validateSupplierSummaries(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const key of warehouseCache.keysWithPrefix("supplier:")) {
    const s = warehouseCache.get<SupplierSummary>(key);
    if (!s) continue;

    if (s.grossSales < s.realizedSales) {
      issues.push({ type: "supplier", id: s.supplierId, issue: `realized sales (${s.realizedSales}) exceeds gross sales (${s.grossSales})` });
    }
    const expectedPayable = Number((s.realizedSales - s.commission).toFixed(3));
    if (Math.abs(expectedPayable - s.netPayable) > 0.01) {
      issues.push({ type: "supplier", id: s.supplierId, issue: `commission mismatch: expected netPayable ~${expectedPayable}, got ${s.netPayable}` });
    }
    if (s.completedOrders + s.cancelledOrders > s.ordersCount) {
      issues.push({ type: "supplier", id: s.supplierId, issue: "mismatched order totals" });
    }
  }
  return issues;
}

export function validateRevenueSummaries(): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const key of warehouseCache.keysWithPrefix("revenue:")) {
    const s = warehouseCache.get<RevenueSummaryPeriod>(key);
    if (!s) continue;

    if (s.grossSales < s.realizedSales) {
      issues.push({ type: "revenue", id: key, issue: `realized sales (${s.realizedSales}) exceeds gross sales (${s.grossSales})` });
    }
    if (s.commissions < 0 || s.grossSales < 0 || s.realizedSales < 0) {
      issues.push({ type: "revenue", id: key, issue: "negative revenue figure found" });
    }
    if (s.saveoRevenue !== s.commissions) {
      issues.push({ type: "revenue", id: key, issue: `saveoRevenue (${s.saveoRevenue}) diverged from commissions (${s.commissions})` });
    }
  }
  return issues;
}

export function validateAll(): { issues: ValidationIssue[]; issueCount: number; consistent: boolean } {
  const issues = [
    ...validateCustomerSummaries(),
    ...validateProductSummaries(),
    ...validateSupplierSummaries(),
    ...validateRevenueSummaries(),
  ];
  return { issues, issueCount: issues.length, consistent: issues.length === 0 };
}
