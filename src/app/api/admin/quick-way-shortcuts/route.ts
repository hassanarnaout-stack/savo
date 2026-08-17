import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { QUICK_WAY_DESTINATION_KEYS } from "@/lib/quick-way-destinations";

const createSchema = z.object({
  destinationKey: z.enum(QUICK_WAY_DESTINATION_KEYS as [string, ...string[]]),
  labelEn: z.string().min(1).max(60),
  labelAr: z.string().min(1).max(60),
  icon: z.string().min(1).max(40),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const shortcuts = await prisma.quickWayShortcut.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ shortcuts });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = createSchema.parse(await req.json());
  const shortcut = await prisma.quickWayShortcut.create({ data: body });
  return NextResponse.json({ success: true, shortcut });
}
