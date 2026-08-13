import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({ newPrice: z.number().positive() });

interface Params {
  params: Promise<{ id: string }>;
}

/** Phase 7.3 — the ONLY code path that ever writes a pricing suggestion to the database. Nothing in the engine itself touches Product.saveoPrice; this always requires an explicit admin call. */
export async function PATCH(req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { newPrice } = schema.parse(await req.json());

  const product = await prisma.product.findUnique({ where: { id }, select: { saveoPrice: true, originalPrice: true } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const discountPct = Number(product.originalPrice) > 0
    ? Math.round((1 - newPrice / Number(product.originalPrice)) * 100)
    : 0;

  const updated = await prisma.product.update({
    where: { id },
    data: { saveoPrice: newPrice, discountPct: Math.max(0, discountPct) },
  });

  logger.info("Pricing suggestion approved", { productId: id, oldPrice: Number(product.saveoPrice), newPrice, byUserId: session.user!.id });

  return NextResponse.json({ success: true, product: updated });
}
