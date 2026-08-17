import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  key: z.string().min(1).max(60),
  keyAr: z.string().max(60).optional(),
  value: z.string().min(1).max(200),
  valueAr: z.string().max(200).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const attributes = await prisma.productAttribute.findMany({ where: { productId: id } });
  return NextResponse.json({ attributes });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const body = schema.parse(await req.json());

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const attribute = await prisma.productAttribute.create({ data: { productId: id, ...body } });
  return NextResponse.json({ success: true, attribute });
}
