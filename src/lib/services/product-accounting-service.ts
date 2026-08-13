import { prisma } from "@/lib/prisma";

/**
 * ProductAccountingService — Phase 5.3 §3
 *
 * Formula (exactly as specified):
 *   Profit = Selling Price − Purchase Cost − Commission − Fees
 *
 * "Commission" here is the LIVE estimate (current Supplier.commissionRate
 * × selling price) — the actual, locked-in commission per sale already
 * exists per-order on SupplierTransaction (Phase 3.4's realized-sales
 * engine, untouched). This service answers a different question:
 * "if I sold this product right now, what would the margin look like?"
 * — a catalog-level view, not a replacement for the real per-sale ledger.
 *
 * "Fees" = VAT (`Product.vatRate`, 0 by default — see schema comment).
 * Room for other fee types later without changing the formula shape.
 */

export interface ProductProfitBreakdown {
  productId: string;
  name: string;
  sellingPrice: number;
  purchaseCost: number | null;
  commissionRate: number;
  commissionAmount: number;
  vatRate: number;
  vatAmount: number;
  netProfit: number | null; // null when purchaseCost isn't set yet — can't claim a real profit figure without it
  marginPercent: number | null;
}

export class ProductAccountingService {
  static calculate(params: {
    sellingPrice: number;
    purchaseCost: number | null;
    commissionRate: number;
    vatRate: number;
  }): Omit<ProductProfitBreakdown, "productId" | "name"> {
    const commissionAmount = Number(((params.sellingPrice * params.commissionRate) / 100).toFixed(3));
    const vatAmount = Number(((params.sellingPrice * params.vatRate) / 100).toFixed(3));

    const netProfit =
      params.purchaseCost === null
        ? null
        : Number((params.sellingPrice - params.purchaseCost - commissionAmount - vatAmount).toFixed(3));

    const marginPercent =
      netProfit === null || params.sellingPrice === 0 ? null : Number(((netProfit / params.sellingPrice) * 100).toFixed(2));

    return {
      sellingPrice: params.sellingPrice,
      purchaseCost: params.purchaseCost,
      commissionRate: params.commissionRate,
      commissionAmount,
      vatRate: params.vatRate,
      vatAmount,
      netProfit,
      marginPercent,
    };
  }

  static async getForProduct(productId: string): Promise<ProductProfitBreakdown | null> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, saveoPrice: true, purchaseCost: true, vatRate: true, supplier: { select: { commissionRate: true } } },
    });
    if (!product) return null;

    const breakdown = this.calculate({
      sellingPrice: Number(product.saveoPrice),
      purchaseCost: product.purchaseCost ? Number(product.purchaseCost) : null,
      commissionRate: Number(product.supplier.commissionRate),
      vatRate: Number(product.vatRate),
    });

    return { productId: product.id, name: product.name, ...breakdown };
  }

  /** Catalog-wide reports — only over products that have `purchaseCost` set (can't report real profit without it). */
  static async getCatalogReport(supplierId?: string) {
    const products = await prisma.product.findMany({
      where: { purchaseCost: { not: null }, status: "ACTIVE", ...(supplierId ? { supplierId } : {}) },
      select: { id: true, name: true, saveoPrice: true, purchaseCost: true, vatRate: true, supplier: { select: { commissionRate: true } } },
    });

    const breakdowns = products.map((p) => ({
      productId: p.id,
      name: p.name,
      ...this.calculate({
        sellingPrice: Number(p.saveoPrice),
        purchaseCost: Number(p.purchaseCost),
        commissionRate: Number(p.supplier.commissionRate),
        vatRate: Number(p.vatRate),
      }),
    }));

    const totalProfit = breakdowns.reduce((sum, b) => sum + (b.netProfit ?? 0), 0);
    const bestProfitProducts = [...breakdowns].sort((a, b) => (b.netProfit ?? 0) - (a.netProfit ?? 0)).slice(0, 10);
    const lossProducts = breakdowns.filter((b) => (b.netProfit ?? 0) < 0).sort((a, b) => (a.netProfit ?? 0) - (b.netProfit ?? 0));

    return {
      totalProfit: Number(totalProfit.toFixed(3)),
      productsWithCostData: breakdowns.length,
      bestProfitProducts,
      lossProducts,
    };
  }
}
