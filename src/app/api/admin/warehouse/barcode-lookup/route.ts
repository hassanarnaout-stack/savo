import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const barcode = req.nextUrl.searchParams.get("barcode");
  if (!barcode) return NextResponse.json({ error: "Missing barcode" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { barcode }, select: { id: true, name: true, stockQty: true } });
  if (!product) return NextResponse.json({ error: "No product found for this barcode" }, { status: 404 });

  return NextResponse.json({ success: true, product });
}
