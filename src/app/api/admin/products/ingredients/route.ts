import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  name: z.string().min(1),
  origin: z.string().optional(),
  benefit: z.string().optional(),
  isAllergen: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const maxOrder = await prisma.productIngredient.aggregate({ where: { productId: body.productId }, _max: { sortOrder: true } });

  const ingredient = await prisma.productIngredient.create({
    data: { ...body, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
  });

  return NextResponse.json({ success: true, ingredient });
}
