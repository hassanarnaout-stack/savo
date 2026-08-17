import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeImport, type RowResult } from "@/lib/services/product-import-service";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const rows: RowResult[] = body.rows ?? [];
  const supplierId: string = body.supplierId;
  if (!supplierId) return NextResponse.json({ error: "supplierId is required — select which supplier this catalog belongs to" }, { status: 400 });

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
  if (!supplier) return NextResponse.json({ error: "Selected supplier does not exist" }, { status: 400 });

  // Only rows with real data (READY or WARNING, never ERROR) are ever
  // imported — enforced here server-side regardless of what the client sends.
  const importable = rows.filter((r) => r.data !== null).map((r) => ({ rowNumber: r.rowNumber, data: r.data! }));

  const result = await executeImport(importable, supplierId, "APPROVED");
  return NextResponse.json(result);
}
