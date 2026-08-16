import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { validateMediaUrl } from "@/lib/media-url-validation";

const schema = z.object({
  productId: z.string().min(1),
  type: z.enum(["MAIN_IMAGE", "GALLERY_IMAGE", "LIFESTYLE_IMAGE", "VIDEO", "IMAGE_360"]),
  url: z.string().url(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  // Server-side validation mirrors the client check (SAVO Media Policy V1) —
  // client-side alone isn't a real boundary. String-pattern only, no
  // outbound fetch of the URL itself (that would be an SSRF vector).
  const check = validateMediaUrl(body.url, body.type === "VIDEO" ? "video" : "image");
  if (!check.valid) {
    return NextResponse.json({ error: check.error ?? "Invalid media URL" }, { status: 400 });
  }

  const media = await prisma.productMedia.create({
    data: { productId: body.productId, type: body.type, url: body.url, sortOrder: body.sortOrder ?? 0 },
  });

  return NextResponse.json({ success: true, media });
}
