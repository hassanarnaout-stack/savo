import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  competitorName: z.string().min(1).max(80),
  price: z.number().positive(),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { productId, competitorName, price } = schema.parse(await req.json());

  const entry = await prisma.competitorPrice.upsert({
    where: { productId_competitorName: { productId, competitorName } },
    create: { productId, competitorName, price, updatedByUserId: session.user!.id! },
    update: { price, updatedByUserId: session.user!.id! },
  });

  return NextResponse.json({ success: true, entry });
}
