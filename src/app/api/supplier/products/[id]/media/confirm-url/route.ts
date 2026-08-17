import { NextRequest, NextResponse } from "next/server";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateMediaUrl } from "@/lib/media-url-validation";
import { z } from "zod";

const schema = z.object({
  url: z.string().min(1),
  type: z.enum(["MAIN_IMAGE", "GALLERY_IMAGE", "LIFESTYLE_IMAGE", "IMAGE_360"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id }, select: { supplierId: true } });
  if (!product || product.supplierId !== gate.supplier.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { url, type } = schema.parse(await req.json());
  const check = validateMediaUrl(url, "image");
  if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    if (type === "MAIN_IMAGE") {
      await tx.productMedia.updateMany({ where: { productId: id, type: "MAIN_IMAGE" }, data: { type: "GALLERY_IMAGE" } });
    }
    const maxSort = await tx.productMedia.aggregate({ where: { productId: id }, _max: { sortOrder: true } });
    return tx.productMedia.create({ data: { productId: id, type, url, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 } });
  });

  return NextResponse.json({ success: true, media: result });
}
