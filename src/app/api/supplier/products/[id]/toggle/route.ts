import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedSupplier } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  let supplier;
  try {
    ({ supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id }, select: { supplierId: true, status: true } });
  if (!existing || existing.supplierId !== supplier.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only ACTIVE <-> DRAFT are manually toggleable here. OUT_OF_STOCK is a
  // system-derived state (Phase 3.2 inventory) and ARCHIVED is permanent.
  if (existing.status !== "ACTIVE" && existing.status !== "DRAFT") {
    return NextResponse.json({ error: "This product's status cannot be toggled manually" }, { status: 400 });
  }

  const nextStatus = existing.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
  await prisma.product.update({ where: { id }, data: { status: nextStatus } });

  return NextResponse.json({ success: true, status: nextStatus });
}
