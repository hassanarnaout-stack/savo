import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ productId: z.string(), urls: z.array(z.string().url()).min(1).max(36) });

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { productId, urls } = schema.parse(await req.json());

  const maxOrder = await prisma.productMedia.aggregate({
    where: { productId, type: "IMAGE_360" },
    _max: { sortOrder: true },
  });
  let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const created = await prisma.$transaction(
    urls.map((url) => prisma.productMedia.create({ data: { productId, type: "IMAGE_360", url, sortOrder: nextOrder++ } }))
  );

  return NextResponse.json({ success: true, created });
}
