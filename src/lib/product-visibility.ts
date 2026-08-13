/**
 * The single definition of "a product the public may see" — Phase 5
 * Product Quality Control. `status: ACTIVE` is the supplier's own on/off
 * switch; `approvalStatus: APPROVED` is the admin's one-time quality
 * gate. A product needs both to show up anywhere customer-facing
 * (homepage, listings, category pages, search, sitemap).
 *
 * Supplier- and admin-facing views (the supplier's own product list, the
 * admin product review queue) deliberately do NOT use this filter — they
 * need to see DRAFT/PENDING_REVIEW/REJECTED products too.
 */
export const PUBLIC_PRODUCT_FILTER = {
  status: "ACTIVE" as const,
  approvalStatus: "APPROVED" as const,
};
