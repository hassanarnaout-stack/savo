import { prisma } from "@/lib/prisma";

/**
 * SAVO Discovery Partners V2 — Phase 1, Step 5 (Affiliate Profit Guard).
 *
 * Real formula, real fields only — never invents missing margin data:
 *
 *   marginPerUnit = saveoPrice - purchaseCost   (purchaseCost is nullable
 *     on Product — supplier-entered, per the existing accounting system;
 *     many products don't have it filled in yet)
 *   affiliateCostPerUnit = saveoPrice * (baseCommissionRate + extraCommissionRate) / 100
 *   contributionPerUnit = marginPerUnit - affiliateCostPerUnit
 *
 * purchaseCost missing → INSUFFICIENT_DATA, no guess, no fabricated
 * verdict. Never blocks a legitimate campaign purely on missing data —
 * only a genuine negative contribution (real numbers, both present)
 * produces WARNING.
 */
export type ProfitGuardVerdict = "SAFE" | "WARNING" | "INSUFFICIENT_DATA";

export interface ProfitGuardProductAssessment {
  productId: string;
  productName: string;
  verdict: ProfitGuardVerdict;
  saveoPrice: number | null;
  purchaseCost: number | null;
  marginPerUnit: number | null;
  affiliateCostPerUnit: number | null;
  contributionPerUnit: number | null;
}

export interface ProfitGuardResult {
  verdict: ProfitGuardVerdict; // worst-case across all assessed products
  products: ProfitGuardProductAssessment[];
}

export class AffiliateProfitGuardService {
  static async assess(productIds: string[], baseCommissionRateAssumed: number, extraCommissionRate: number): Promise<ProfitGuardResult> {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, saveoPrice: true, purchaseCost: true },
    });

    const assessments: ProfitGuardProductAssessment[] = products.map((p) => {
      const saveoPrice = Number(p.saveoPrice);
      const purchaseCost = p.purchaseCost !== null ? Number(p.purchaseCost) : null;

      if (purchaseCost === null) {
        return {
          productId: p.id,
          productName: p.name,
          verdict: "INSUFFICIENT_DATA",
          saveoPrice,
          purchaseCost: null,
          marginPerUnit: null,
          affiliateCostPerUnit: null,
          contributionPerUnit: null,
        };
      }

      const marginPerUnit = saveoPrice - purchaseCost;
      const affiliateCostPerUnit = Number((saveoPrice * ((baseCommissionRateAssumed + extraCommissionRate) / 100)).toFixed(3));
      const contributionPerUnit = Number((marginPerUnit - affiliateCostPerUnit).toFixed(3));

      return {
        productId: p.id,
        productName: p.name,
        verdict: contributionPerUnit >= 0 ? "SAFE" : "WARNING",
        saveoPrice,
        purchaseCost,
        marginPerUnit,
        affiliateCostPerUnit,
        contributionPerUnit,
      };
    });

    const verdict: ProfitGuardVerdict = assessments.some((a) => a.verdict === "WARNING")
      ? "WARNING"
      : assessments.some((a) => a.verdict === "INSUFFICIENT_DATA")
        ? "INSUFFICIENT_DATA"
        : "SAFE";

    return { verdict, products: assessments };
  }
}
