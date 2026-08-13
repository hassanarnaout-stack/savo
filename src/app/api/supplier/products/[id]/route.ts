import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedSupplier } from "@/lib/auth";
import { setStockQuantity } from "@/lib/inventory";
import { calcDiscountPct } from "@/lib/utils";
import { validateBarcode } from "@/lib/barcode";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  description: z.string().min(1),
  descriptionAr: z.string().optional(),
  categoryId: z.string().min(1),
  type: z.enum(["STANDARD", "DEAL", "MYSTERY_BOX", "RESCUE"]),
  originalPrice: z.string(),
  saveoPrice: z.string(),
  stockQty: z.string(),
  lowStockAlert: z.string(),
  dealEndsAt: z.string().optional(),
  expiryDate: z.string().optional(),
  imageUrl: z.string().optional(),
  mysteryBoxReveal: z.string().optional(),
  barcode: z.string().optional(),
  productStory: z.string().max(2000).optional(),
  originStory: z.string().max(1000).optional(),
  highlightFeatures: z.array(z.object({ icon: z.string(), label: z.string() })).max(8).optional(),
  internalCode: z.string().optional(),
  purchaseCost: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * SECURITY: every handler below first loads the product and checks
 * `product.supplierId === supplier.id` (the supplier resolved from the
 * session, not from anything the client sent). If it doesn't match, we
 * return 404 rather than 403 — this avoids confirming to a caller that a
 * product with that id exists at all under a different supplier.
 */

export async function PUT(req: NextRequest, { params }: Params) {
  let session, supplier;
  try {
    ({ session, supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id }, select: { supplierId: true, stockQty: true } });
  if (!existing || existing.supplierId !== supplier.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = schema.parse(await req.json());
  const originalPrice = parseFloat(body.originalPrice);
  const saveoPrice = parseFloat(body.saveoPrice);
  const newStockQty = parseInt(body.stockQty, 10);

  const barcode = body.barcode?.trim() || null;
  if (barcode) {
    const check = validateBarcode(barcode);
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Every field EXCEPT stockQty — stock changes are never a plain field
      // write, they always go through setStockQuantity so a history row is
      // guaranteed.
      await tx.product.update({
        where: { id },
        data: {
          name: body.name,
          nameAr: body.nameAr || null,
          description: body.description,
          descriptionAr: body.descriptionAr || null,
          categoryId: body.categoryId,
          type: body.type,
          originalPrice,
          saveoPrice,
          discountPct: calcDiscountPct(originalPrice, saveoPrice),
          lowStockAlert: parseInt(body.lowStockAlert, 10),
          dealEndsAt: body.dealEndsAt ? new Date(body.dealEndsAt) : null,
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
          mysteryBoxReveal: body.mysteryBoxReveal || null,
          barcode,
          internalCode: body.internalCode || null,
          purchaseCost: body.purchaseCost ? parseFloat(body.purchaseCost) : null,
          ...(body.productStory !== undefined || body.originStory !== undefined || body.highlightFeatures !== undefined
            ? {
                productStory: body.productStory,
                originStory: body.originStory,
                highlightFeatures: body.highlightFeatures,
                experienceApproved: false, // any change to supplier-submitted content requires fresh admin approval
              }
            : {}),
        },
      });

      if (newStockQty !== existing.stockQty) {
        await setStockQuantity(tx, {
          productId: id,
          supplierId: supplier.id,
          newQuantity: newStockQty,
          userId: session.user.id,
          actionType: "MANUAL_UPDATE",
          note: "Updated via product edit form",
        });
      }

      if (body.imageUrl) {
        const existingImage = await tx.productImage.findFirst({ where: { productId: id, isPrimary: true } });
        if (existingImage) {
          await tx.productImage.update({ where: { id: existingImage.id }, data: { url: body.imageUrl } });
        } else {
          await tx.productImage.create({ data: { productId: id, url: body.imageUrl, isPrimary: true } });
        }
      }
    });
  } catch (err: any) {
    if (err?.code === "P2002" && err?.meta?.target?.includes?.("barcode")) {
      return NextResponse.json({ error: "This barcode is already used by another product." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not update product" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let supplier;
  try {
    ({ supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id }, select: { supplierId: true } });
  if (!existing || existing.supplierId !== supplier.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A product that has ever appeared in an order must be preserved for
  // order-history integrity — soft delete (archive) instead of removing it.
  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });

  if (orderItemCount > 0) {
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    return NextResponse.json({ success: true, hardDeleted: false });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true, hardDeleted: true });
}
