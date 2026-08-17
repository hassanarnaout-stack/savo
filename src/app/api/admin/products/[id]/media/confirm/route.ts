import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyImageExists, buildCloudflareUrl } from "@/lib/cloudflare-images";
import { z } from "zod";

const schema = z.object({
  imageId: z.string().min(1),
  type: z.enum(["MAIN_IMAGE", "GALLERY_IMAGE", "LIFESTYLE_IMAGE", "IMAGE_360"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const { imageId, type } = schema.parse(await req.json());

  // Verify the image actually exists on Cloudflare before trusting the
  // browser's success report, and before creating any DB record.
  const exists = await verifyImageExists(imageId);
  if (!exists) return NextResponse.json({ error: "Upload could not be verified on Cloudflare" }, { status: 400 });

  const url = buildCloudflareUrl(imageId, "public");

  const result = await prisma.$transaction(async (tx) => {
    if (type === "MAIN_IMAGE") {
      // Exactly one authoritative Main Image — demote any existing one.
      await tx.productMedia.updateMany({ where: { productId: id, type: "MAIN_IMAGE" }, data: { type: "GALLERY_IMAGE" } });
    }
    const maxSort = await tx.productMedia.aggregate({ where: { productId: id }, _max: { sortOrder: true } });
    return tx.productMedia.create({ data: { productId: id, type, url, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 } });
  });

  return NextResponse.json({ success: true, media: result });
}
