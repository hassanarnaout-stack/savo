import { prisma } from "@/lib/prisma";
import { AffiliateProfitGuardService, type ProfitGuardResult } from "@/lib/services/affiliate-profit-guard-service";

export class AffiliateBoostCampaignService {
  /**
   * Supplier ownership validation (Discovery Partners V2 Phase 1 —
   * "Supplier Safety"). Reuses the existing Supplier.ownerUserId /
   * Product.supplierId relations already governing every other
   * supplier-facing surface in the app — no new ownership system.
   * Throws if ANY requested product doesn't actually belong to this
   * supplier; never silently drops the offending products.
   */
  static async assertSupplierOwnsProducts(supplierId: string, productIds: string[]) {
    const owned = await prisma.product.findMany({ where: { id: { in: productIds }, supplierId }, select: { id: true } });
    const ownedIds = new Set(owned.map((p) => p.id));
    const notOwned = productIds.filter((id) => !ownedIds.has(id));
    if (notOwned.length > 0) {
      throw new Error(`You don't own ${notOwned.length} of the selected product(s).`);
    }
  }

  /** Most conservative available baseline for Profit Guard — the highest
   * commission rate among currently ACTIVE affiliates, since that's the
   * worst real case SAVO could actually pay on this campaign. Falls back
   * to the schema default (2%) only when there are zero affiliates yet. */
  static async getAssumedBaseCommissionRate(): Promise<number> {
    const max = await prisma.affiliateAccount.aggregate({ where: { status: "ACTIVE" }, _max: { commissionRate: true } });
    return max._max.commissionRate ?? 2;
  }

  static async runProfitGuard(productIds: string[], extraCommissionRate: number): Promise<ProfitGuardResult> {
    const baseRate = await this.getAssumedBaseCommissionRate();
    return AffiliateProfitGuardService.assess(productIds, baseRate, extraCommissionRate);
  }
}
