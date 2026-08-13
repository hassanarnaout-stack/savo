import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  probability: z.number().min(0.01).max(100).optional(),
  isSpecialItem: z.boolean().optional(),
});

interface Params {
  params: Promise<{ id: string; contentId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { contentId } = await params;
  const body = updateSchema.parse(await req.json());

  const content = await prisma.mysteryBoxContent.update({ where: { id: contentId }, data: body });
  return NextResponse.json({ success: true, content });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { contentId } = await params;
  await prisma.mysteryBoxContent.delete({ where: { id: contentId } });
  return NextResponse.json({ success: true });
}
