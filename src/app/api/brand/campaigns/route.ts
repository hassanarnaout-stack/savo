import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveBrand } from "@/lib/auth";
import { BrandBillingService } from "@/lib/services/brand-billing-service";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["PRODUCT_BOOST", "BRAND_TAKEOVER", "MYSTERY_BOX_SPONSOR", "CATEGORY_CAMPAIGN", "CHALLENGE_CAMPAIGN", "SEASONAL_CAMPAIGN"]),
  objective: z.string().min(1),
  budget: z.number().positive(),
  startAt: z.string(),
  endAt: z.string(),
  audienceSegmentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let brand;
  try {
    ({ brand } = await requireActiveBrand());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const now = new Date();
  const status = new Date(body.startAt) <= now && new Date(body.endAt) > now ? "ACTIVE" : "DRAFT";

  const campaign = await prisma.brandMarketingCampaign.create({
    data: {
      brandId: brand.id,
      type: body.type,
      objective: body.objective,
      budget: body.budget,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      audienceSegmentId: body.audienceSegmentId,
      status,
    },
  });

  await BrandBillingService.createInvoice({ brandId: brand.id, type: "CAMPAIGN", amount: body.budget });

  return NextResponse.json({ success: true, campaign });
}
