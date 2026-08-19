import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BrandCampaignService } from "@/lib/services/brand-campaign-service";
import { z } from "zod";

const activeSchema = z.object({ isActive: z.boolean() });
const updateSchema = z.object({
  brandName: z.string().min(1).optional(),
  bannerImageUrl: z.string().nullable().optional(),
  bannerLinkUrl: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  headline: z.string().nullable().optional(),
  headlineAr: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  labelAr: z.string().nullable().optional(),
  ctaText: z.string().nullable().optional(),
  ctaTextAr: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  showPrice: z.boolean().optional(),
  showStockUrgency: z.boolean().optional(),
  productId: z.string().nullable().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const raw = await req.json();

  // Backward-compatible: the original isActive-only toggle keeps working exactly as before.
  if (Object.keys(raw).length === 1 && "isActive" in raw) {
    const { isActive } = activeSchema.parse(raw);
    const campaign = await BrandCampaignService.setActive(id, isActive);
    return NextResponse.json({ success: true, campaign });
  }

  const body = updateSchema.parse(raw);
  const campaign = await BrandCampaignService.update(id, {
    ...body,
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    endDate: body.endDate ? new Date(body.endDate) : undefined,
  });
  return NextResponse.json({ success: true, campaign });
}

/** Safe delete — no order/financial record references a BrandCampaign directly; SponsoredPlacement rows cascade. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await BrandCampaignService.remove(id);
  return NextResponse.json({ success: true });
}
