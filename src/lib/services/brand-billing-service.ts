import { prisma } from "@/lib/prisma";

/**
 * BrandBillingService — Phase 5.4 §12
 *
 * Every paid brand action creates a real BrandInvoice row — this is
 * what powers the revenue figures on both the brand dashboard and the
 * admin Revenue Dashboard (§15). No external payment gateway is wired
 * in this phase — invoices are created PENDING, ready for a future
 * billing integration to mark them PAID.
 */
export class BrandBillingService {
  static async createInvoice(params: {
    brandId: string;
    type: "SPONSORED_PRODUCT" | "CAMPAIGN" | "SUBSCRIPTION" | "TAKEOVER" | "MYSTERY_BOX_SPONSOR";
    amount: number;
  }) {
    return prisma.brandInvoice.create({
      data: { brandId: params.brandId, type: params.type, amount: params.amount, status: "PENDING" },
    });
  }

  static async markPaid(invoiceId: string) {
    return prisma.brandInvoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });
  }

  static async getForBrand(brandId: string) {
    return prisma.brandInvoice.findMany({ where: { brandId }, orderBy: { createdAt: "desc" } });
  }
}
