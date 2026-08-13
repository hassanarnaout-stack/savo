import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedSupplier } from "@/lib/auth";
import { setStockQuantity } from "@/lib/inventory";
import { calcDiscountPct, slugify } from "@/lib/utils";
import { validateBarcode } from "@/lib/barcode";
import { NotificationService } from "@/lib/notifications/service";
import { z } from "zod";

// NOTE: `supplierId` is deliberately NOT a field in this schema. If a
// client sends one, it is silently ignored — the supplier is always
// resolved server-side from the authenticated session.
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
  internalCode: z.string().optional(),
  purchaseCost: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let session, supplier;
  try {
    ({ session, supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const originalPrice = parseFloat(body.originalPrice);
  const saveoPrice = parseFloat(body.saveoPrice);
  const initialStock = parseInt(body.stockQty, 10);

  const barcode = body.barcode?.trim() || null;
  if (barcode) {
    const check = validateBarcode(barcode);
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
  }

  const baseSlug = slugify(body.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  let productId: string;
  try {
    productId = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: body.name,
          nameAr: body.nameAr || null,
          slug,
          description: body.description,
          descriptionAr: body.descriptionAr || null,
          categoryId: body.categoryId,
          supplierId: supplier.id, // <-- server-derived, not client-supplied
          type: body.type,
          originalPrice,
          saveoPrice,
          discountPct: calcDiscountPct(originalPrice, saveoPrice),
          stockQty: 0, // set for real just below, via setStockQuantity, so it's logged
          lowStockAlert: parseInt(body.lowStockAlert, 10),
          dealStartsAt: body.type === "DEAL" ? new Date() : null,
          dealEndsAt: body.dealEndsAt ? new Date(body.dealEndsAt) : null,
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
          mysteryBoxReveal: body.mysteryBoxReveal || null,
          barcode,
          internalCode: body.internalCode || null,
          purchaseCost: body.purchaseCost ? parseFloat(body.purchaseCost) : null,
          openingStock: initialStock,
          status: "ACTIVE",
          approvalStatus: "PENDING_REVIEW", // Phase 5: every new supplier submission needs admin quality review before going public
          images: body.imageUrl ? { create: [{ url: body.imageUrl, isPrimary: true, sortOrder: 0 }] } : undefined,
        },
      });

      if (initialStock > 0) {
        await setStockQuantity(tx, {
          productId: product.id,
          supplierId: supplier.id,
          newQuantity: initialStock,
          userId: session.user.id,
          actionType: "MANUAL_UPDATE",
          note: "Initial stock on product creation",
        });
      }

      return product.id;
    });
  } catch (err: any) {
    // P2002 = Prisma unique constraint violation. Barcode is the only
    // user-editable unique field on this form (slug is generated safely
    // above), so this is always a duplicate barcode in practice.
    if (err?.code === "P2002" && err?.meta?.target?.includes?.("barcode")) {
      return NextResponse.json({ error: "This barcode is already used by another product." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not create product" }, { status: 500 });
  }

  const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { email: true } });
  for (const admin of admins) {
    NotificationService.dispatch({
      type: "PRODUCT_APPROVAL_NEEDED",
      recipientEmail: admin.email,
      data: { productName: body.name, supplierName: supplier.companyName },
    });
  }

  return NextResponse.json({ id: productId });
}
