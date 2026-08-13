import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(80),
  metric: z.enum(["REFERRAL_COUNT", "REVENUE"]),
  threshold: z.number().positive(),
  giftCardAmount: z.number().min(0).max(200),
  newCommissionRate: z.number().min(0).max(50).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rules = await prisma.affiliateMilestoneRule.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const maxOrder = await prisma.affiliateMilestoneRule.aggregate({ _max: { sortOrder: true } });

  const rule = await prisma.affiliateMilestoneRule.create({
    data: { ...body, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
  });

  return NextResponse.json({ success: true, rule });
}
