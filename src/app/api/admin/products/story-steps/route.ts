import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  productId: z.string(),
  stepType: z.enum(["ORIGIN", "MANUFACTURING", "INGREDIENTS", "QUALITY", "CERTIFICATE", "AWARD", "CUSTOM"]),
  title: z.string().min(1),
  content: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = createSchema.parse(await req.json());
  const maxOrder = await prisma.productStoryStep.aggregate({ where: { productId: body.productId }, _max: { sortOrder: true } });

  const step = await prisma.productStoryStep.create({
    data: { ...body, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
  });

  return NextResponse.json({ success: true, step });
}
