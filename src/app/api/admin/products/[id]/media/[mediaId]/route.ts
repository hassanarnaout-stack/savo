import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudflareImage } from "@/lib/cloudflare-images";
import { parseCloudflareImageId } from "@/lib/cloudflare-images";
import { z } from "zod";

const patchSchema = z.object({
  sortOrder: z.number().int().optional(),
  type: z.enum(["MAIN_IMAGE", "GALLERY_IMAGE", "LIFESTYLE_IMAGE", "IMAGE_360"]).optional(),
});

async function assertOwnsMedia(productId: string, mediaId: string) {
  const media = await prisma.productMedia.findUnique({ where: { id: mediaId }, select: { productId: true } });
  return !!media && media.productId === productId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id, mediaId } = await params;
  if (!(await assertOwnsMedia(id, mediaId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id, mediaId } = await params;
  const media = await prisma.productMedia.findUnique({ where: { id: mediaId } });
  if (!media || media.productId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const imageId = parseCloudflareImageId(media.url);
  if (imageId) {
    const result = await deleteCloudflareImage(imageId);
    if (!result.success) {
      // Never claim success if the remote asset couldn't actually be
      // removed — the DB row is kept so the image doesn't silently
      // "disappear" from SAVO while still existing (and billable) on
      // Cloudflare.
      return NextResponse.json({ error: `Could not delete from Cloudflare: ${result.error}` }, { status: 502 });
    }
  }
  // Legacy/external URLs (imageId === null) have nothing to delete remotely.

  await prisma.productMedia.delete({ where: { id: mediaId } });
  return NextResponse.json({ success: true });
}
