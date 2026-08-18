import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestDirectUpload, verifyImageExists, buildCloudflareUrl, isCloudflareImagesConfigured, deleteCloudflareImage, parseCloudflareImageId } from "@/lib/cloudflare-images";
import { z } from "zod";

/** Reuses the exact same Cloudflare Images infrastructure already
 * built for product media (requestDirectUpload/verifyImageExists/
 * buildCloudflareUrl) — zero second storage provider, zero duplicated
 * direct-upload logic. `field` distinguishes which Brand column gets
 * the resulting URL (logoUrl vs coverImageUrl); Brand has no separate
 * media table (unlike ProductMedia) since it only ever needs at most
 * two images — a direct URL column is a safe, proportionate design
 * for that scale. */
const fieldSchema = z.enum(["logoUrl", "coverImageUrl"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!isCloudflareImagesConfigured()) return NextResponse.json({ error: "Cloudflare Images is not configured." }, { status: 503 });

  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const { field } = z.object({ field: fieldSchema }).parse(await req.json());
  const { uploadURL, imageId } = await requestDirectUpload({ brandId: id, field });
  return NextResponse.json({ uploadURL, imageId, field });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const { field, imageId } = z.object({ field: fieldSchema, imageId: z.string().min(1) }).parse(await req.json());

  const exists = await verifyImageExists(imageId);
  if (!exists) return NextResponse.json({ error: "Upload could not be verified on Cloudflare" }, { status: 400 });

  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  // Best-effort cleanup of the previous image for this field — never
  // block saving the new one if the old delete fails.
  const previousUrl = field === "logoUrl" ? brand.logoUrl : brand.coverImageUrl;
  const previousImageId = previousUrl ? parseCloudflareImageId(previousUrl) : null;
  if (previousImageId) deleteCloudflareImage(previousImageId).catch(() => {});

  const url = buildCloudflareUrl(imageId, "public");
  const updated = await prisma.brand.update({ where: { id }, data: { [field]: url } });
  return NextResponse.json({ success: true, brand: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const { field } = z.object({ field: fieldSchema }).parse(await req.json());

  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  const currentUrl = field === "logoUrl" ? brand.logoUrl : brand.coverImageUrl;
  const currentImageId = currentUrl ? parseCloudflareImageId(currentUrl) : null;
  if (currentImageId) {
    const result = await deleteCloudflareImage(currentImageId);
    if (!result.success) return NextResponse.json({ error: `Could not delete from Cloudflare: ${result.error}` }, { status: 502 });
  }

  const updated = await prisma.brand.update({ where: { id }, data: { [field]: null } });
  return NextResponse.json({ success: true, brand: updated });
}
