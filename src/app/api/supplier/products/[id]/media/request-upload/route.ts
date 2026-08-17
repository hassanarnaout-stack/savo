import { NextRequest, NextResponse } from "next/server";
import { getSupplierAccountGate } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestDirectUpload, isCloudflareImagesConfigured } from "@/lib/cloudflare-images";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (!isCloudflareImagesConfigured()) return NextResponse.json({ error: "Cloudflare Images is not configured." }, { status: 503 });

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { supplierId: true } });
  if (!product || product.supplierId !== gate.supplier.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { uploadURL, imageId } = await requestDirectUpload({ productId: id, supplierId: gate.supplier.id });
  return NextResponse.json({ uploadURL, imageId });
}
