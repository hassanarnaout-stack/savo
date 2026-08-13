import { prisma } from "@/lib/prisma";
import { getSupplierKPIs } from "@/lib/supplier-analytics";

/**
 * EnterpriseSupplierKPIsService — Phase 7.5
 *
 * getSupplierKPIs (src/lib/supplier-analytics.ts) already computes
 * everything needed per-supplier — this just calls it for every
 * verified supplier and assembles a platform-wide comparison table.
 * Zero duplicated KPI math.
 */
export class EnterpriseSupplierKPIsService {
  static async getAll() {
    const suppliers = await prisma.supplier.findMany({
      where: { verificationStatus: "VERIFIED" },
      select: { id: true, companyName: true },
    });

    const results = await Promise.all(
      suppliers.map(async (s) => ({ supplierId: s.id, name: s.companyName, kpis: await getSupplierKPIs(s.id) }))
    );

    return results.sort((a, b) => b.kpis.realizedSales - a.kpis.realizedSales);
  }
}
