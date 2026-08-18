import { prisma } from "@/lib/prisma";
import { calcDiscountPct, slugify } from "@/lib/utils";
import { validateBarcode } from "@/lib/barcode";
import { validateMediaUrl } from "@/lib/media-url-validation";
import * as XLSX from "xlsx";

/**
 * Product Import Center — foundation service, shared by both admin and
 * supplier import flows (supplierId is injected by the caller, never
 * trusted from the file — see executeImport). Reuses the exact same
 * production validators/helpers the manual product forms already use
 * (validateBarcode, validateMediaUrl, slugify, calcDiscountPct) — no
 * parallel validation logic.
 */

// Explicit whitelist — the only fields a spreadsheet can ever populate.
// Never expose internal fields (purchaseCost, internalCode, discoveryScore,
// supplierId, reservedStock, etc.) through this importer.
export const IMPORT_FIELDS = [
  "sku",
  "barcode",
  "name",
  "nameAr",
  "description",
  "descriptionAr",
  "brand",
  "category", // resolved by name/slug, see resolveCategory
  "saveoPrice",
  "originalPrice",
  "stockQty",
  "weightGrams",
  "type", // STANDARD | DEAL | MYSTERY_BOX | RESCUE — defaults to STANDARD
  "mainImageUrl",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ColumnMapping {
  [sourceHeader: string]: ImportField | `attribute:${string}` | `attribute:${string}:ar` | null;
}

export interface RowResult {
  rowNumber: number;
  status: "READY" | "WARNING" | "ERROR";
  messages: string[];
  data: Record<string, any> | null;
}

/** Parses CSV or XLSX — the `xlsx` library (already a project dependency)
 * reads both formats through the same API, so no separate CSV parser is
 * needed. */
export function parseImportFile(buffer: Buffer, filename: string): ParsedFile {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[]) ?? [];
  return { headers, rows };
}

/** Simple normalized-string matching — no AI/LLM, per spec. Suggestions
 * only; the user reviews/changes every mapping before import. */
const SUGGEST_ALIASES: Record<ImportField, string[]> = {
  sku: ["sku", "item code", "product code", "code"],
  barcode: ["barcode", "ean", "upc", "gtin"],
  name: ["name", "product name", "title", "english name"],
  nameAr: ["name ar", "arabic name", "arabic product", "name_ar"],
  description: ["description", "desc", "english description"],
  descriptionAr: ["description ar", "arabic description", "desc_ar"],
  brand: ["brand", "manufacturer"],
  category: ["category", "cat"],
  saveoPrice: ["saveo price", "price", "sale price", "selling price"],
  originalPrice: ["original price", "list price", "rrp", "msrp"],
  stockQty: ["stock", "quantity", "qty", "stock qty"],
  weightGrams: ["weight", "weight grams", "weight (g)"],
  type: ["type", "product type"],
  mainImageUrl: ["image", "main image", "image url", "photo"],
};

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const normalized = header.trim().toLowerCase();
    if (normalized.startsWith("attribute:")) {
      mapping[header] = header as any; // pass through — attribute columns map to themselves
      continue;
    }
    const match = (Object.entries(SUGGEST_ALIASES) as [ImportField, string[]][]).find(([, aliases]) => aliases.includes(normalized));
    mapping[header] = match ? match[0] : null;
  }
  return mapping;
}

async function resolveCategoryId(nameOrSlug: string): Promise<string | null> {
  const trimmed = nameOrSlug.trim();
  if (!trimmed) return null;
  const category = await prisma.category.findFirst({
    where: { OR: [{ slug: trimmed }, { name: { equals: trimmed, mode: "insensitive" } }] },
    select: { id: true },
  });
  return category?.id ?? null;
}

/**
 * Validates every row against real production rules and returns a
 * READY/WARNING/ERROR verdict per row — never imports anything itself.
 * Batches SKU/barcode uniqueness checks (two queries total, not one per
 * row) to avoid N+1 lookups on large files.
 */
export async function validateImportRows(rows: Record<string, string>[], mapping: ColumnMapping, supplierId: string | null): Promise<RowResult[]> {
  const skusInFile = new Set<string>();
  const barcodesInFile = new Set<string>();
  const results: RowResult[] = [];

  const mappedRows = rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (!field) continue;
      mapped[field] = (row[header] ?? "").toString().trim();
    }
    return mapped;
  });

  const skuCandidates = mappedRows.map((r) => r.sku).filter(Boolean);
  const barcodeCandidates = mappedRows.map((r) => r.barcode).filter(Boolean);
  const [existingSkus, existingBarcodes] = await Promise.all([
    skuCandidates.length ? prisma.product.findMany({ where: { sku: { in: skuCandidates } }, select: { sku: true } }) : Promise.resolve([]),
    barcodeCandidates.length ? prisma.product.findMany({ where: { barcode: { in: barcodeCandidates } }, select: { barcode: true } }) : Promise.resolve([]),
  ]);
  const existingSkuSet = new Set(existingSkus.map((p) => p.sku));
  const existingBarcodeSet = new Set(existingBarcodes.map((p) => p.barcode));

  for (let i = 0; i < mappedRows.length; i++) {
    const rowNumber = i + 2; // 1-indexed + header row
    const r = mappedRows[i];
    const messages: string[] = [];
    let status: RowResult["status"] = "READY";

    if (!r.name?.trim()) {
      messages.push("Missing required field: name");
      status = "ERROR";
    }
    if (!r.description?.trim()) {
      messages.push("Missing required field: description");
      status = "ERROR";
    }

    const originalPrice = parseFloat(r.originalPrice);
    const saveoPrice = parseFloat(r.saveoPrice);
    if (!r.originalPrice || isNaN(originalPrice) || originalPrice <= 0) {
      messages.push("Invalid or missing originalPrice");
      status = "ERROR";
    }
    if (!r.saveoPrice || isNaN(saveoPrice) || saveoPrice <= 0) {
      messages.push("Invalid or missing saveoPrice");
      status = "ERROR";
    }
    if (!isNaN(originalPrice) && !isNaN(saveoPrice) && saveoPrice > originalPrice) {
      messages.push("saveoPrice is higher than originalPrice");
      status = status === "ERROR" ? "ERROR" : "WARNING";
    }

    const stockQty = r.stockQty ? parseInt(r.stockQty, 10) : 0;
    if (r.stockQty && (isNaN(stockQty) || stockQty < 0)) {
      messages.push("Invalid stockQty");
      status = "ERROR";
    }

    let categoryId: string | null = null;
    if (!r.category?.trim()) {
      messages.push("Missing required field: category");
      status = "ERROR";
    } else {
      categoryId = await resolveCategoryId(r.category);
      if (!categoryId) {
        messages.push(`Category "${r.category}" does not match any existing category`);
        status = "ERROR";
      }
    }

    if (r.sku) {
      if (existingSkuSet.has(r.sku)) {
        messages.push(`SKU "${r.sku}" already exists`);
        status = "ERROR";
      } else if (skusInFile.has(r.sku)) {
        messages.push(`Duplicate SKU "${r.sku}" within this file`);
        status = "ERROR";
      }
      skusInFile.add(r.sku);
    }

    if (r.barcode) {
      const check = validateBarcode(r.barcode);
      if (!check.valid) {
        messages.push(`Invalid barcode: ${check.error}`);
        status = status === "ERROR" ? "ERROR" : "WARNING";
      } else if (existingBarcodeSet.has(r.barcode)) {
        messages.push(`Barcode "${r.barcode}" already exists`);
        status = "ERROR";
      } else if (barcodesInFile.has(r.barcode)) {
        messages.push(`Duplicate barcode "${r.barcode}" within this file`);
        status = "ERROR";
      }
      barcodesInFile.add(r.barcode);
    }

    if (r.mainImageUrl) {
      const check = validateMediaUrl(r.mainImageUrl, "image");
      if (!check.valid) {
        messages.push(`Invalid image URL: ${check.error}`);
        status = status === "ERROR" ? "ERROR" : "WARNING";
      }
    }

    if (r.type && !["STANDARD", "DEAL", "MYSTERY_BOX", "RESCUE"].includes(r.type)) {
      messages.push(`Unrecognized type "${r.type}" — will default to STANDARD`);
      status = status === "ERROR" ? "ERROR" : "WARNING";
    }

    // Dynamic attribute:* columns
    const attributes: { key: string; keyAr?: string; value: string; valueAr?: string }[] = [];
    for (const [header, field] of Object.entries(mapping)) {
      if (typeof field === "string" && field.startsWith("attribute:") && !field.endsWith(":ar")) {
        const key = field.replace("attribute:", "");
        const value = (rows[i][header] ?? "").toString().trim();
        if (value) {
          const arHeader = Object.entries(mapping).find(([, f]) => f === `attribute:${key}:ar`)?.[0];
          const valueAr = arHeader ? (rows[i][arHeader] ?? "").toString().trim() : undefined;
          attributes.push({ key, value, valueAr: valueAr || undefined });
        }
      }
    }

    results.push({
      rowNumber,
      status,
      messages,
      data:
        status === "ERROR"
          ? null
          : {
              sku: r.sku || null,
              barcode: r.barcode || null,
              name: r.name,
              nameAr: r.nameAr || null,
              description: r.description,
              descriptionAr: r.descriptionAr || null,
              brand: r.brand || null,
              categoryId,
              originalPrice,
              saveoPrice,
              stockQty: isNaN(stockQty) ? 0 : stockQty,
              weightGrams: r.weightGrams ? parseInt(r.weightGrams, 10) || null : null,
              type: ["STANDARD", "DEAL", "MYSTERY_BOX", "RESCUE"].includes(r.type) ? r.type : "STANDARD",
              mainImageUrl: r.mainImageUrl || null,
              attributes,
            },
    });
  }

  return results;
}

export interface ImportExecutionResult {
  totalRows: number;
  imported: number;
  failed: number;
  failures: { rowNumber: number; error: string }[];
}

/**
 * Imports only rows already marked READY/WARNING by validateImportRows
 * (ERROR rows are never passed in — the caller filters them out).
 * supplierId is a required parameter here, always resolved server-side
 * by the calling API route from the authenticated session — never
 * accepted from the request body or the file itself.
 *
 * Batched in chunks of 25 products, each product's own row processed
 * in its own transaction (product + images + attributes succeed or
 * fail together) — never one giant transaction for the whole file, and
 * a single bad row never blocks the rest of the batch.
 */
export async function executeImport(readyRows: { rowNumber: number; data: NonNullable<RowResult["data"]> }[], supplierId: string, approvalStatus: "APPROVED" | "PENDING_REVIEW"): Promise<ImportExecutionResult> {
  const CHUNK_SIZE = 25;
  const failures: ImportExecutionResult["failures"] = [];
  let imported = 0;

  for (let i = 0; i < readyRows.length; i += CHUNK_SIZE) {
    const chunk = readyRows.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async ({ rowNumber, data }) => {
        try {
          await prisma.$transaction(async (tx) => {
            const discountPct = calcDiscountPct(data.originalPrice, data.saveoPrice);
            const slugBase = slugify(data.name);
            let slug = slugBase;
            let suffix = 1;
            while (await tx.product.findUnique({ where: { slug }, select: { id: true } })) {
              slug = `${slugBase}-${suffix++}`;
            }

            const product = await tx.product.create({
              data: {
                name: data.name,
                nameAr: data.nameAr,
                slug,
                description: data.description,
                descriptionAr: data.descriptionAr,
                sku: data.sku,
                barcode: data.barcode,
                brandName: data.brand, // Product Import Bug Fix — the storefront reads Product.brandName exclusively (/brands, /brands/[slug], the brand filter, homepage brand discovery); this write target used to be the wrong field (Product.brand, a separate unrelated column) so imported products were invisible to every brand-facing surface. The internal field name/user-facing "Brand" column header are unchanged — only this persistence target moved.
                categoryId: data.categoryId,
                supplierId,
                type: data.type,
                originalPrice: data.originalPrice,
                saveoPrice: data.saveoPrice,
                discountPct,
                stockQty: data.stockQty,
                weightGrams: data.weightGrams,
                status: "ACTIVE",
                approvalStatus,
              },
            });

            if (data.mainImageUrl) {
              await tx.productImage.create({ data: { productId: product.id, url: data.mainImageUrl, isPrimary: true, sortOrder: 0 } });
            }

            if (data.attributes.length > 0) {
              await tx.productAttribute.createMany({
                data: data.attributes.map((a: any) => ({ productId: product.id, key: a.key, keyAr: a.keyAr, value: a.value, valueAr: a.valueAr })),
              });
            }
          });
          imported++;
        } catch (err: any) {
          failures.push({ rowNumber, error: err?.message ?? "Unknown error" });
        }
      })
    );
  }

  return { totalRows: readyRows.length, imported, failed: failures.length, failures };
}
