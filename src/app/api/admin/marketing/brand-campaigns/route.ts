import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BrandCampaignService } from "@/lib/services/brand-campaign-service";
import { z } from "zod";

const schema = z.object({
  brandName: z.string().min(1),
  type: z.enum(["SPONSORED_PRODUCT", "HOMEPAGE_BANNER", "CATEGORY_HIGHLIGHT", "SEARCH_BOOST"]),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  bannerImageUrl: z.string().optional(),
  bannerLinkUrl: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().positive(),
  headline: z.string().optional(),
  headlineAr: z.string().optional(),
  label: z.string().optional(),
  labelAr: z.string().optional(),
  ctaText: z.string().optional(),
  ctaTextAr: z.string().optional(),
  sortOrder: z.number().optional(),
  showPrice: z.boolean().optional(),
  showStockUrgency: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const campaign = await BrandCampaignService.create({
    ...body,
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),
  });

  return NextResponse.json({ success: true, campaign });
}
