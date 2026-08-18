import { NextRequest, NextResponse } from "next/server";
import { deriveStatusChange } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { calcDiscountPct } from "@/lib/utils";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  brandName: z.string().optional(),
  brandId: z.string().nullable().optional(),
  isSubscribable: z.boolean().optional(),
  description: z.string().min(1),
  categoryId: z.string().min(1),
  supplierId: z.string().min(1),
  type: z.enum(["STANDARD", "DEAL", "MYSTERY_BOX", "RESCUE"]),
  originalPrice: z.string(),
  saveoPrice: z.string(),
  stockQty: z.string(),
  lowStockAlert: z.string(),
  dealEndsAt: z.string().optional(),
  expiryDate: z.string().optional(),
  imageUrl: z.string().optional(),
  mysteryBoxReveal: z.string().optional(),
  mysteryBoxValueMin: z.string().optional(),
  mysteryBoxValueMax: z.string().optional(),
  mysteryBoxTier: z.enum(["BRONZE", "SILVER", "GOLD"]).optional(),
  mysteryBoxLockedCount: z.string().optional(),
  mysteryBoxChooseCount: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = productSchema.parse(await req.json());

  const originalPrice = parseFloat(body.originalPrice);
  const saveoPrice = parseFloat(body.saveoPrice);
  const discountPct = calcDiscountPct(originalPrice, saveoPrice);

  const currentProduct = await prisma.product.findUniqueOrThrow({ where: { id }, select: { status: true, reservedStock: true } });
  const newStockQty = parseInt(body.stockQty, 10);
  const availableAfter = Math.max(0, newStockQty - currentProduct.reservedStock);
  const statusChange = deriveStatusChange(currentProduct.status, availableAfter);

  await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      slug: body.slug,
      brandName: body.brandName || null,
      brandId: body.brandId || null,
      isSubscribable: body.isSubscribable ?? false,
      description: body.description,
      categoryId: body.categoryId,
      supplierId: body.supplierId,
      type: body.type,
      originalPrice,
      saveoPrice,
      discountPct,
      stockQty: parseInt(body.stockQty, 10),
      lowStockAlert: parseInt(body.lowStockAlert, 10),
      dealEndsAt: body.dealEndsAt ? new Date(body.dealEndsAt) : null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      mysteryBoxReveal: body.mysteryBoxReveal || null,
      mysteryBoxValueMin: body.mysteryBoxValueMin ? parseFloat(body.mysteryBoxValueMin) : null,
      mysteryBoxValueMax: body.mysteryBoxValueMax ? parseFloat(body.mysteryBoxValueMax) : null,
      mysteryBoxTier: body.mysteryBoxTier || null,
      mysteryBoxLockedCount: body.mysteryBoxLockedCount ? parseInt(body.mysteryBoxLockedCount, 10) : 1,
      mysteryBoxChooseCount: body.mysteryBoxChooseCount ? parseInt(body.mysteryBoxChooseCount, 10) : 0,
      status: statusChange ?? currentProduct.status,
    },
  });

  if (body.imageUrl) {
    const existingImage = await prisma.productImage.findFirst({ where: { productId: id, isPrimary: true } });
    if (existingImage) {
      await prisma.productImage.update({ where: { id: existingImage.id }, data: { url: body.imageUrl } });
    } else {
      await prisma.productImage.create({ data: { productId: id, url: body.imageUrl, isPrimary: true } });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  return NextResponse.json({ success: true });
}
