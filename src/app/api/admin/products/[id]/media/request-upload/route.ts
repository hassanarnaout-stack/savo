import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestDirectUpload, isCloudflareImagesConfigured } from "@/lib/cloudflare-images";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!isCloudflareImagesConfigured()) return NextResponse.json({ error: "Cloudflare Images is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_IMAGES_API_TOKEN, CLOUDFLARE_IMAGES_ACCOUNT_HASH." }, { status: 503 });

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const { uploadURL, imageId } = await requestDirectUpload({ productId: id });
  return NextResponse.json({ uploadURL, imageId });
}
