import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  experienceType: z.enum(["STANDARD", "PREMIUM", "LUXURY", "MYSTERY", "FLASH"]).optional(),
  experienceApproved: z.boolean().optional(),
  discoveryScore: z.number().int().min(0).max(100).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json());

  const product = await prisma.product.update({ where: { id }, data: body });

  logger.info("Product experience settings changed", { productId: id, ...body, byUserId: session.user!.id });

  return NextResponse.json({ success: true, product });
}
