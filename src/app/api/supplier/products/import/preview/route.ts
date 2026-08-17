import { NextRequest, NextResponse } from "next/server";
import { getSupplierAccountGate } from "@/lib/auth";
import { parseImportFile, suggestColumnMapping, validateImportRows, type ColumnMapping } from "@/lib/services/product-import-service";

const MAX_ROWS = 5000;

export async function POST(req: NextRequest) {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseImportFile(buffer, file.name);
    if (parsed.rows.length > MAX_ROWS) {
      return NextResponse.json({ error: `File has ${parsed.rows.length} rows — the limit is ${MAX_ROWS} per import. Split into smaller files.` }, { status: 400 });
    }
    const mapping = suggestColumnMapping(parsed.headers);
    return NextResponse.json({ headers: parsed.headers, rows: parsed.rows, suggestedMapping: mapping });
  }

  const body = await req.json();
  const rows: Record<string, string>[] = body.rows ?? [];
  const mapping: ColumnMapping = body.mapping ?? {};
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Too many rows (limit ${MAX_ROWS})` }, { status: 400 });

  const results = await validateImportRows(rows, mapping, gate.supplier.id);
  const summary = {
    total: results.length,
    ready: results.filter((r) => r.status === "READY").length,
    warning: results.filter((r) => r.status === "WARNING").length,
    error: results.filter((r) => r.status === "ERROR").length,
  };
  return NextResponse.json({ results, summary });
}
