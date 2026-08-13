import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedSupplier } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  let supplier;
  try {
    ({ supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const q = searchParams.get("q") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  // SECURITY: identical scoping to the report page — supplier.id only,
  // never a value from the request.
  const where = {
    supplierId: supplier.id,
    ...(status ? { status: status as any } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          supplierOrder: {
            OR: [
              { supplierOrderNumber: { contains: q, mode: "insensitive" as const } },
              { order: { orderNumber: { contains: q, mode: "insensitive" as const } } },
            ],
          },
        }
      : {}),
  };

  const transactions = await prisma.supplierTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000, // sane export cap
    select: {
      createdAt: true,
      saleAmount: true,
      commissionAmount: true,
      supplierAmount: true,
      status: true,
      supplierOrder: { select: { supplierOrderNumber: true, order: { select: { orderNumber: true } } } },
    },
  });

  const rows = transactions.map((t) => ({
    Date: new Date(t.createdAt).toISOString().slice(0, 10),
    "Order #": t.supplierOrder.supplierOrderNumber ?? "",
    "Parent Order #": t.supplierOrder.order.orderNumber,
    "Sale Amount (KD)": Number(t.saleAmount).toFixed(3),
    "Commission (KD)": Number(t.commissionAmount).toFixed(3),
    "Net Amount (KD)": Number(t.supplierAmount).toFixed(3),
    Status: t.status,
  }));

  const filename = `saveo-financial-report-${new Date().toISOString().slice(0, 10)}`;

  if (format === "csv") {
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  // xlsx
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

function toCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}
