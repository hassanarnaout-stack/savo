import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  nameEn: z.string().min(1).max(120).optional(),
  nameAr: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  threshold: z.number().positive().optional(),
  giftCardAmount: z.number().min(0).max(500).optional(),
  bonusCommissionRate: z.number().min(0).max(50).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const body = updateSchema.parse(await req.json());
  const mission = await prisma.affiliateMission.update({
    where: { id },
    data: { ...body, startAt: body.startAt ? new Date(body.startAt) : undefined, endAt: body.endAt ? new Date(body.endAt) : undefined },
  });
  return NextResponse.json({ success: true, mission });
}
