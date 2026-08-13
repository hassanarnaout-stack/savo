/**
 * Brand Districts — real slugification for Product.brandName, since
 * brands here are a plain string field (not a separate table). Simple
 * and deterministic: lowercase, spaces to hyphens, strip anything
 * that isn't alphanumeric/hyphen. We always match against the live
 * set of distinct brandName values (not by reconstructing the
 * original string from the slug), so this only needs to be
 * consistent, not perfectly reversible.
 */
export function brandNameToSlug(brandName: string): string {
  return brandName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
