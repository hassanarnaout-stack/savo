import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveBrand } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1),
  image: z.string().optional(),
  copy: z.string().optional(),
  discount: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  let brand;
  try {
    ({ brand } = await requireActiveBrand());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const campaign = await prisma.brandMarketingCampaign.findUnique({ where: { id: body.campaignId }, select: { brandId: true } });
  if (!campaign || campaign.brandId !== brand.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const variant = await prisma.campaignVariant.create({ data: body });
  return NextResponse.json({ success: true, variant });
}
