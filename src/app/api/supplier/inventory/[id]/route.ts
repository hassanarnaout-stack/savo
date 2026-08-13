import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedSupplier } from "@/lib/auth";
import { setStockQuantity } from "@/lib/inventory";
import { z } from "zod";

const schema = z.object({
  newQuantity: z.number().int().min(0),
  actionType: z.enum(["MANUAL_UPDATE", "RESTOCK"]).default("MANUAL_UPDATE"),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let session, supplier;
  try {
    ({ session, supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id }, select: { supplierId: true } });
  if (!existing || existing.supplierId !== supplier.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = schema.parse(await req.json());

  await prisma.$transaction(async (tx) => {
    await setStockQuantity(tx, {
      productId: id,
      supplierId: supplier.id,
      newQuantity: body.newQuantity,
      userId: session.user.id,
      actionType: body.actionType,
    });
  });

  return NextResponse.json({ success: true });
}
