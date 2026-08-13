import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  type: z.enum(["TRENDING", "LIMITED", "EXCLUSIVE", "SAVEO_PLUS", "AWARD_WINNER", "CHEF_CHOICE", "HEALTHY_CHOICE", "KIDS_FAVORITE", "PREMIUM", "NEW_ARRIVAL", "BEST_SELLER", "EDITORS_PICK"]),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { productId, type } = schema.parse(await req.json());
  const badge = await prisma.productBadge.upsert({
    where: { productId_type: { productId, type } },
    create: { productId, type, isAutomatic: false },
    update: {},
  });

  return NextResponse.json({ success: true, badge });
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { productId, type } = schema.parse(await req.json());
  await prisma.productBadge.deleteMany({ where: { productId, type } });
  return NextResponse.json({ success: true });
}
