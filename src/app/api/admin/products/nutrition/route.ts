import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  servingSize: z.string().optional(),
  calories: z.number().optional(),
  proteinG: z.number().optional(),
  carbsG: z.number().optional(),
  sugarG: z.number().optional(),
  fatG: z.number().optional(),
  saturatedFatG: z.number().optional(),
  fiberG: z.number().optional(),
  sodiumMg: z.number().optional(),
  dietTags: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { productId, ...data } = schema.parse(await req.json());
  const fact = await prisma.productNutritionFact.upsert({
    where: { productId },
    create: { productId, ...data },
    update: data,
  });

  return NextResponse.json({ success: true, fact });
}
