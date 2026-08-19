import { prisma } from "@/lib/prisma";
import type { DiscoverySlide } from "@/components/home/discovery-ad-screen";

/**
 * Real, scheduled, admin-managed SAVO Discovery ad slides — active
 * HOMEPAGE_BANNER BrandCampaign rows within their start/end window,
 * ordered by sortOrder. Price/stock are resolved live from the linked
 * real product here (never trusted from a stored campaign field) —
 * exactly what showPrice/showStockUrgency are permitted to do per the
 * approved schema note.
 */
export async function getDiscoveryAdSlides(take = 6): Promise<DiscoverySlide[]> {
  const now = new Date();
  const campaigns = await prisma.brandCampaign.findMany({
    where: { type: "HOMEPAGE_BANNER", isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { sortOrder: "asc" },
    take,
    select: {
      id: true, brandName: true, bannerImageUrl: true, bannerLinkUrl: true,
      headline: true, headlineAr: true, label: true, labelAr: true, ctaText: true, ctaTextAr: true,
      showPrice: true, showStockUrgency: true,
      product: { select: { slug: true, saveoPrice: true, stockQty: true } },
    },
  });

  return campaigns
    .filter((c) => c.bannerLinkUrl || c.product) // needs a real destination one way or another
    .map((c) => ({
      id: c.id,
      imageUrl: c.bannerImageUrl,
      destinationUrl: c.bannerLinkUrl ?? `/products/${c.product!.slug}`,
      headline: c.headline,
      headlineAr: c.headlineAr,
      label: c.label,
      labelAr: c.labelAr,
      ctaText: c.ctaText,
      ctaTextAr: c.ctaTextAr,
      brandName: c.brandName,
      price: c.showPrice && c.product ? Number(c.product.saveoPrice) : null,
      stockQty: c.showStockUrgency && c.product ? c.product.stockQty : null,
    }));
}
