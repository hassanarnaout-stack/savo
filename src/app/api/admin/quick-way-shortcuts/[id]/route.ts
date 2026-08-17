import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { QUICK_WAY_DESTINATION_KEYS } from "@/lib/quick-way-destinations";

const updateSchema = z.object({
  destinationKey: z.enum(QUICK_WAY_DESTINATION_KEYS as [string, ...string[]]).optional(),
  labelEn: z.string().min(1).max(60).optional(),
  labelAr: z.string().min(1).max(60).optional(),
  icon: z.string().min(1).max(40).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const body = updateSchema.parse(await req.json());
  const shortcut = await prisma.quickWayShortcut.update({ where: { id }, data: body });
  return NextResponse.json({ success: true, shortcut });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.quickWayShortcut.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
