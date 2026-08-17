import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/** Shared by both admin and supplier import pages — a real, empty
 * downloadable template (correct headers + one filled example row)
 * generated with the same `xlsx` library the importer itself uses to
 * parse files, so what gets downloaded is guaranteed to be exactly
 * what gets accepted back. No new dependency, no static file to keep
 * in sync by hand. */
export async function GET() {
  const headers = [
    "Name", "Name (Arabic)", "Description", "Description (Arabic)",
    "Category", "Brand", "SKU", "Barcode",
    "Original Price", "Saveo Price", "Stock Qty", "Weight (grams)", "Type",
    "Main Image URL", "attribute:Volume", "attribute:Volume:ar",
  ];
  const exampleRow = [
    "Lindt Excellence Dark Chocolate 100g", "لينت إكسيلانس شوكولاتة داكنة ١٠٠ جرام",
    "Rich, indulgent dark chocolate bar.", "شوكولاتة داكنة غنية.",
    "Chocolates & Sweets", "Lindt", "LINDT-DARK-100", "7610400123456",
    "2.500", "1.750", "50", "100", "STANDARD",
    "https://example.com/lindt-dark-100.jpg", "100g", "١٠٠ جرام",
  ];

  const sheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Products");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=savo-product-import-template.xlsx",
    },
  });
}
