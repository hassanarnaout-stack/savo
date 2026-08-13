import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  sweetness: z.number().int().min(0).max(5).optional(),
  sourness: z.number().int().min(0).max(5).optional(),
  bitterness: z.number().int().min(0).max(5).optional(),
  saltiness: z.number().int().min(0).max(5).optional(),
  spiciness: z.number().int().min(0).max(5).optional(),
  richness: z.number().int().min(0).max(5).optional(),
  firstTasteNote: z.string().max(200).optional(),
  midTasteNote: z.string().max(200).optional(),
  finishNote: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { productId, ...data } = schema.parse(await req.json());
  const profile = await prisma.productFlavorProfile.upsert({
    where: { productId },
    create: { productId, ...data },
    update: data,
  });

  return NextResponse.json({ success: true, profile });
}
