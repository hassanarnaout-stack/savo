import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AffiliateBoostCampaignService } from "@/lib/services/affiliate-boost-campaign-service";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  fundingSource: z.enum(["ADMIN", "SUPPLIER"]),
  supplierId: z.string().optional(),
  extraCommissionRate: z.number().min(0).max(50),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  budget: z.number().positive().optional(),
  productIds: z.array(z.string()).min(1),
  overrideProfitGuard: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const campaigns = await prisma.affiliateBoostCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { products: { include: { product: { select: { id: true, name: true, slug: true } } } }, supplier: { select: { companyName: true } } },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  let adminUserId: string;
  try {
    const session = await requireAdmin();
    adminUserId = session.user!.id!;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = createSchema.parse(await req.json());

  if (body.fundingSource === "SUPPLIER") {
    if (!body.supplierId) return NextResponse.json({ error: "supplierId is required for supplier-funded campaigns" }, { status: 400 });
    try {
      await AffiliateBoostCampaignService.assertSupplierOwnsProducts(body.supplierId, body.productIds);
    } catch (err) {
    const message = err instanceof Error ? err.message : "Ownership check failed";
      return NextResponse.json({ error: message }, { status: 403 });
    }
  }

  const guard = await AffiliateBoostCampaignService.runProfitGuard(body.productIds, body.extraCommissionRate);
  if (guard.verdict === "WARNING" && !body.overrideProfitGuard) {
    return NextResponse.json({ error: "Profit Guard: this campaign would produce negative contribution on at least one product.", guard }, { status: 409 });
  }

  const campaign = await prisma.affiliateBoostCampaign.create({
    data: {
      name: body.name,
      description: body.description,
      fundingSource: body.fundingSource,
      supplierId: body.fundingSource === "SUPPLIER" ? body.supplierId : null,
      extraCommissionRate: body.extraCommissionRate,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      budget: body.budget,
      createdByUserId: adminUserId,
      products: { create: body.productIds.map((productId: string) => ({ productId })) },
    },
    include: { products: true },
  });

  return NextResponse.json({ success: true, campaign, guard });
}
