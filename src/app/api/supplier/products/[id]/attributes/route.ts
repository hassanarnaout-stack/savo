import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupplierAccountGate } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  key: z.string().min(1).max(60),
  keyAr: z.string().max(60).optional(),
  value: z.string().min(1).max(200),
  valueAr: z.string().max(200).optional(),
});

/** Ownership check reused from the exact pattern the existing supplier
 * product edit page already uses: 404 (not 403) when the product
 * doesn't exist OR belongs to a different supplier — never reveal
 * another supplier's product exists. productId is never trusted from
 * the client without this check. */
async function assertOwnsProduct(productId: string, supplierId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { supplierId: true } });
  return !!product && product.supplierId === supplierId;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;

  if (!(await assertOwnsProduct(id, gate.supplier.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attributes = await prisma.productAttribute.findMany({ where: { productId: id } });
  return NextResponse.json({ attributes });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;

  if (!(await assertOwnsProduct(id, gate.supplier.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = schema.parse(await req.json());
  const attribute = await prisma.productAttribute.create({ data: { productId: id, ...body } });
  return NextResponse.json({ success: true, attribute });
}
