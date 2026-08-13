import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  nameAr: z.string().optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const collections = await prisma.collection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const existing = await prisma.collection.findUnique({ where: { slug: body.slug } });
  if (existing) return NextResponse.json({ error: "A collection with this slug already exists." }, { status: 400 });

  const maxOrder = await prisma.collection.aggregate({ _max: { sortOrder: true } });
  const collection = await prisma.collection.create({ data: { ...body, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 } });

  return NextResponse.json({ success: true, collection });
}
