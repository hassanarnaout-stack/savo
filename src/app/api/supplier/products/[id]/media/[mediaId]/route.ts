import { NextRequest, NextResponse } from "next/server";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudflareImage, parseCloudflareImageId } from "@/lib/cloudflare-images";
import { z } from "zod";

const patchSchema = z.object({
  sortOrder: z.number().int().optional(),
  type: z.enum(["MAIN_IMAGE", "GALLERY_IMAGE", "LIFESTYLE_IMAGE", "IMAGE_360"]).optional(),
});

/** Two-layer ownership check: the product must belong to this
 * supplier, AND the media row must belong to that same product — a
 * supplier can never touch another supplier's ProductMedia by guessing
 * a mediaId, even for a product they don't own. */
async function assertOwnsProductAndMedia(productId: string, mediaId: string, supplierId: string) {
  const [product, media] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { supplierId: true } }),
    prisma.productMedia.findUnique({ where: { id: mediaId }, select: { productId: true } }),
  ]);
  return !!product && product.supplierId === supplierId && !!media && media.productId === productId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id, mediaId } = await params;
  if (!(await assertOwnsProductAndMedia(id, mediaId, gate.supplier.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = patchSchema.parse(await req.json());

  if (body.type === "MAIN_IMAGE") {
    await prisma.$transaction([
      prisma.productMedia.updateMany({ where: { productId: id, type: "MAIN_IMAGE" }, data: { type: "GALLERY_IMAGE" } }),
      prisma.productMedia.update({ where: { id: mediaId }, data: { type: "MAIN_IMAGE" } }),
    ]);
    return NextResponse.json({ success: true });
  }

  const media = await prisma.productMedia.update({ where: { id: mediaId }, data: body });
  return NextResponse.json({ success: true, media });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id, mediaId } = await params;
  if (!(await assertOwnsProductAndMedia(id, mediaId, gate.supplier.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const media = await prisma.productMedia.findUnique({ where: { id: mediaId } });
  const imageId = media ? parseCloudflareImageId(media.url) : null;
  if (imageId) {
    const result = await deleteCloudflareImage(imageId);
    if (!result.success) return NextResponse.json({ error: `Could not delete from Cloudflare: ${result.error}` }, { status: 502 });
  }

  await prisma.productMedia.delete({ where: { id: mediaId } });
  return NextResponse.json({ success: true });
}
