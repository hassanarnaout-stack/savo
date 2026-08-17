import { NextRequest, NextResponse } from "next/server";
import { getSupplierAccountGate } from "@/lib/auth";
import { executeImport, type RowResult } from "@/lib/services/product-import-service";

/** supplierId is ALWAYS resolved from the authenticated session gate —
 * never accepted from the request body. A supplier importing a
 * spreadsheet can only ever create products under their own account,
 * exactly like the existing manual supplier product form. */
export async function POST(req: NextRequest) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const rows: RowResult[] = body.rows ?? [];
  const importable = rows.filter((r) => r.data !== null).map((r) => ({ rowNumber: r.rowNumber, data: r.data! }));

  const result = await executeImport(importable, gate.supplier.id, "PENDING_REVIEW");
  return NextResponse.json(result);
}
