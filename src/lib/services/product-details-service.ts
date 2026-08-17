/**
 * PDP Product Information — Product Details table.
 *
 * Explicit safe whitelist, never a blind iteration over the Prisma
 * Product object. Two sources only:
 *   1. A small, hand-picked set of universal fields (brand, weight) —
 *      only included when the real value exists.
 *   2. ProductAttribute[] — the flexible, category-agnostic
 *      specification model (already supports arbitrary key/value
 *      pairs per product, with keyAr/valueAr for Arabic).
 *
 * barcode/SKU are deliberately excluded from this primary
 * customer-facing table per the approved product decision. Every
 * genuinely internal/operational field (purchaseCost, internalCode,
 * discoveryScore, supplierId, reservedStock, openingStock,
 * soldQuantity, returnedQuantity, damagedQuantity, expiredQuantity)
 * is structurally impossible to leak here — this function never
 * receives the full Product row, only the specific fields listed in
 * its parameter type below.
 */
export interface ProductDetailRow {
  label: string;
  value: string;
}

export function buildProductDetailsRows(
  product: {
    brand: string | null;
    weightGrams: number | null;
  },
  attributes: { key: string; keyAr: string | null; value: string; valueAr: string | null }[],
  isArabic: boolean
): ProductDetailRow[] {
  const rows: ProductDetailRow[] = [];

  if (product.brand && product.brand.trim()) {
    rows.push({ label: isArabic ? "العلامة التجارية" : "Brand", value: product.brand });
  }
  if (typeof product.weightGrams === "number" && product.weightGrams > 0) {
    const value = product.weightGrams >= 1000 ? `${(product.weightGrams / 1000).toFixed(product.weightGrams % 1000 === 0 ? 0 : 1)} kg` : `${product.weightGrams} g`;
    rows.push({ label: isArabic ? "الوزن" : "Weight", value });
  }

  for (const attr of attributes) {
    const label = isArabic && attr.keyAr ? attr.keyAr : attr.key;
    const value = isArabic && attr.valueAr ? attr.valueAr : attr.value;
    if (!label?.trim() || !value?.trim()) continue; // never render an empty row
    rows.push({ label, value });
  }

  return rows;
}
