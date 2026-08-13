import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Product decision: customers see a unified Saveo experience and never
 * browse or land on an individual supplier's storefront/brand page —
 * order confirmations, product cards, and homepage rails all avoid
 * naming suppliers too (see order detail page, Deal of the Hour card,
 * and the removed homepage "Featured Suppliers" section). This route is
 * kept (rather than deleted) only so a stray bookmark/old link 404s
 * cleanly instead of erroring.
 */
export default async function SupplierStorefrontPage(_props: Props) {
  notFound();
}
