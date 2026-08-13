import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedSupplier } from "@/lib/auth";
import { recordReturn, recordDamage, recordExpiry } from "@/lib/inventory";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["RETURNED", "DAMAGED", "EXPIRED"]),
  quantity: z.number().int().positive(),
  note: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  let session, supplier;
  try {
    ({ session, supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: productId } = await params;
  const body = schema.parse(await req.json());

  // Ownership check — supplierId is derived from session, never trusted from the client.
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { supplierId: true } });
  if (!product || product.supplierId !== supplier.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const fn = body.type === "RETURNED" ? recordReturn : body.type === "DAMAGED" ? recordDamage : recordExpiry;
      await fn(tx, {
        productId,
        supplierId: supplier.id,
        quantity: body.quantity,
        userId: session.user!.id,
        note: body.note,
      });
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not record adjustment" }, { status: 500 });
  }
}
