import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ productId: z.string() });

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { productId } = schema.parse(await req.json());

  const existing = await prisma.collectionProduct.findUnique({ where: { collectionId_productId: { collectionId: id, productId } } });
  if (existing) return NextResponse.json({ error: "This product is already in the collection." }, { status: 400 });

  const maxOrder = await prisma.collectionProduct.aggregate({ where: { collectionId: id }, _max: { sortOrder: true } });
  const entry = await prisma.collectionProduct.create({
    data: { collectionId: id, productId, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
  });

  return NextResponse.json({ success: true, entry });
}
