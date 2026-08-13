import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedSupplier } from "@/lib/auth";
import { setStockQuantity } from "@/lib/inventory";
import { z } from "zod";

const schema = z.object({
  updates: z
    .array(
      z.object({
        productId: z.string().min(1),
        newQuantity: z.number().int().min(0),
      })
    )
    .min(1)
    .max(200), // sane upper bound per request
});

interface ItemResult {
  productId: string;
  success: boolean;
  error?: string;
}

export async function POST(req: NextRequest) {
  let session, supplier;
  try {
    ({ session, supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  // Each row is its own transaction so one bad row can't roll back the
  // rest — the caller gets a per-item success/failure report, as required.
  const results: ItemResult[] = [];

  for (const update of body.updates) {
    try {
      const existing = await prisma.product.findUnique({
        where: { id: update.productId },
        select: { supplierId: true },
      });

      // SECURITY: ownership re-verified per row — a client can't smuggle
      // another supplier's productId into the batch.
      if (!existing || existing.supplierId !== supplier.id) {
        results.push({ productId: update.productId, success: false, error: "Not found or not yours" });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await setStockQuantity(tx, {
          productId: update.productId,
          supplierId: supplier.id,
          newQuantity: update.newQuantity,
          userId: session.user.id,
          actionType: "MANUAL_UPDATE",
          note: "Bulk inventory update",
        });
      });

      results.push({ productId: update.productId, success: true });
    } catch (err) {
      results.push({ productId: update.productId, success: false, error: "Update failed" });
    }
  }

  return NextResponse.json({
    results,
    successCount: results.filter((r) => r.success).length,
    failCount: results.filter((r) => !r.success).length,
  });
}
