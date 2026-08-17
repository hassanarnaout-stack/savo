import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  extraCommissionRate: z.number().min(0).max(50).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  budget: z.number().positive().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const body = updateSchema.parse(await req.json());

  const campaign = await prisma.affiliateBoostCampaign.update({
    where: { id },
    data: {
      ...body,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt ? new Date(body.endAt) : undefined,
    },
  });
  return NextResponse.json({ success: true, campaign });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const campaign = await prisma.affiliateBoostCampaign.findUnique({
    where: { id },
    include: {
      products: { include: { product: { select: { id: true, name: true, slug: true } } } },
      referrals: { where: { boostCampaignId: id }, select: { status: true, boostCommissionAmount: true, affiliateId: true } },
    },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const remainingBudget = campaign.budget !== null ? Number(campaign.budget) - Number(campaign.confirmedSpend) : null;

  return NextResponse.json({ campaign, remainingBudget });
}
