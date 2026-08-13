import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string; productId: string }>;
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, productId } = await params;
  await prisma.collectionProduct.delete({ where: { collectionId_productId: { collectionId: id, productId } } });
  return NextResponse.json({ success: true });
}
