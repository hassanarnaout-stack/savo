import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { calcDiscountPct } from "@/lib/utils";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  brandName: z.string().optional(),
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

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = productSchema.parse(await req.json());

  const originalPrice = parseFloat(body.originalPrice);
  const saveoPrice = parseFloat(body.saveoPrice);
  const discountPct = calcDiscountPct(originalPrice, saveoPrice);

  const product = await prisma.product.create({
    data: {
      name: body.name,
      slug: body.slug,
      brandName: body.brandName || null,
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
      dealStartsAt: body.type === "DEAL" ? new Date() : null,
      dealEndsAt: body.dealEndsAt ? new Date(body.dealEndsAt) : null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      mysteryBoxReveal: body.mysteryBoxReveal || null,
      mysteryBoxValueMin: body.mysteryBoxValueMin ? parseFloat(body.mysteryBoxValueMin) : null,
      mysteryBoxValueMax: body.mysteryBoxValueMax ? parseFloat(body.mysteryBoxValueMax) : null,
      mysteryBoxTier: body.mysteryBoxTier || null,
      mysteryBoxLockedCount: body.mysteryBoxLockedCount ? parseInt(body.mysteryBoxLockedCount, 10) : 1,
      mysteryBoxChooseCount: body.mysteryBoxChooseCount ? parseInt(body.mysteryBoxChooseCount, 10) : 0,
      status: "ACTIVE",
      images: body.imageUrl
        ? { create: [{ url: body.imageUrl, isPrimary: true, sortOrder: 0 }] }
        : undefined,
    },
  });

  return NextResponse.json({ id: product.id });
}
