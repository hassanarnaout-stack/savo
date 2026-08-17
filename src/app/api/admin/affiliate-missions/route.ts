import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  nameEn: z.string().min(1).max(120),
  nameAr: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  metric: z.enum(["CONFIRMED_ORDER_COUNT", "CONFIRMED_REVENUE"]),
  threshold: z.number().positive(),
  giftCardAmount: z.number().min(0).max(500).default(0),
  bonusCommissionRate: z.number().min(0).max(50).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const missions = await prisma.affiliateMission.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { awards: true } } } });
  return NextResponse.json({ missions });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = schema.parse(await req.json());
  const mission = await prisma.affiliateMission.create({
    data: { ...body, startAt: new Date(body.startAt), endAt: new Date(body.endAt) },
  });
  return NextResponse.json({ success: true, mission });
}
