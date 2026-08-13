import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  threshold: z.number().positive().optional(),
  giftCardAmount: z.number().min(0).max(200).optional(),
  newCommissionRate: z.number().min(0).max(50).nullable().optional(),
  isActive: z.boolean().optional(),
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
  const body = schema.parse(await req.json());

  const rule = await prisma.affiliateMilestoneRule.update({ where: { id }, data: body });
  return NextResponse.json({ success: true, rule });
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.affiliateMilestoneRule.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
