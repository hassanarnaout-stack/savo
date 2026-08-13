import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  maxWinners: z.number().int().positive(),
  rewardLabel: z.string().min(1),
  startAt: z.string(),
  endAt: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const campaign = await prisma.campaign.create({
    data: {
      name: "Limited Time Hunt",
      slug: `hunt-${Date.now()}`,
      type: "LIMITED_TIME_HUNT",
      status: "INACTIVE", // admin activates from the campaign manager, subject to the same max-2-active rule
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      config: {
        productId: body.productId,
        maxWinners: body.maxWinners,
        reward: { type: "CREDIT", label: body.rewardLabel, value: null },
      },
    },
  });

  return NextResponse.json({ success: true, campaign });
}
