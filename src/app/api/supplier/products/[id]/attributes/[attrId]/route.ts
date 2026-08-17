import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupplierAccountGate } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  key: z.string().min(1).max(60).optional(),
  keyAr: z.string().max(60).optional(),
  value: z.string().min(1).max(200).optional(),
  valueAr: z.string().max(200).optional(),
});

async function assertOwnsProduct(productId: string, supplierId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { supplierId: true } });
  return !!product && product.supplierId === supplierId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; attrId: string }> }) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id, attrId } = await params;

  if (!(await assertOwnsProduct(id, gate.supplier.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.productAttribute.findUnique({ where: { id: attrId } });
  if (!existing || existing.productId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = schema.parse(await req.json());
  const attribute = await prisma.productAttribute.update({ where: { id: attrId }, data: body });
  return NextResponse.json({ success: true, attribute });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; attrId: string }> }) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id, attrId } = await params;

  if (!(await assertOwnsProduct(id, gate.supplier.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.productAttribute.findUnique({ where: { id: attrId } });
  if (!existing || existing.productId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.productAttribute.delete({ where: { id: attrId } });
  return NextResponse.json({ success: true });
}
