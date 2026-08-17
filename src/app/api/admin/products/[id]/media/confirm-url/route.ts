import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateMediaUrl } from "@/lib/media-url-validation";
import { z } from "zod";

const schema = z.object({
  url: z.string().min(1),
  type: z.enum(["MAIN_IMAGE", "GALLERY_IMAGE", "LIFESTYLE_IMAGE", "IMAGE_360"]),
});

/** Secondary "Add from URL" path — reuses the existing validateMediaUrl
 * validator (same one the manual product forms and Bulk Import already
 * use), no Cloudflare interaction. This is the legacy/migration
 * fallback, kept exactly as the spec requires. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
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
