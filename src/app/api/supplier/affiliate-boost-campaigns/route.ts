import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedSupplier } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AffiliateBoostCampaignService } from "@/lib/services/affiliate-boost-campaign-service";

const schema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  extraCommissionRate: z.number().min(0).max(50),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  budget: z.number().positive(), // required for supplier-funded — no unlimited-budget self-serve spend
  productIds: z.array(z.string()).min(1),
});

/**
 * Supplier Affiliate Boost (Discovery Partners V2 Phase 1, Step 8).
 * Always fundingSource=SUPPLIER, always this supplier's own id — never
 * client-supplied. Ownership is re-validated server-side against real
 * Product.supplierId before any campaign is created (same check the
 * admin route uses) — a supplier can never boost another supplier's
 * product no matter what the request body claims.
 */
export async function POST(req: NextRequest) {
  let supplierId: string;
  let supplierUserId: string;
  try {
    const { supplier, session } = await requireVerifiedSupplier();
    supplierId = supplier.id;
    supplierUserId = session.user!.id!;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  try {
    await AffiliateBoostCampaignService.assertSupplierOwnsProducts(supplierId, body.productIds);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ownership check failed";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  // Suppliers never receive a Profit Guard override — WARNING always blocks.
  const guard = await AffiliateBoostCampaignService.runProfitGuard(body.productIds, body.extraCommissionRate);
  if (guard.verdict === "WARNING") {
    return NextResponse.json({ error: "Profit Guard: this campaign would produce negative contribution on at least one product.", guard }, { status: 409 });
  }

  const campaign = await prisma.affiliateBoostCampaign.create({
    data: {
      name: body.name,
      description: body.description,
      fundingSource: "SUPPLIER",
      supplierId,
      extraCommissionRate: body.extraCommissionRate,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      budget: body.budget,
      createdByUserId: supplierUserId,
      products: { create: body.productIds.map((productId: string) => ({ productId })) },
    },
  });

  return NextResponse.json({ success: true, campaign, guard });
}

export async function GET() {
  let supplierId: string;
  try {
    const { supplier } = await requireVerifiedSupplier();
    supplierId = supplier.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const campaigns = await prisma.affiliateBoostCampaign.findMany({
    where: { supplierId },
    orderBy: { createdAt: "desc" },
    include: { products: { include: { product: { select: { id: true, name: true, slug: true } } } } },
  });
  return NextResponse.json({ campaigns });
}
