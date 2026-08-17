import { parseCloudflareImageId, buildCloudflareUrl, type SavoImageVariant } from "@/lib/cloudflare-images";

/**
 * Single place the whole app calls to get a display URL for a
 * ProductMedia/ProductImage row's `url` field, at the right size for
 * its context. Cloudflare-hosted images get resized via variant;
 * legacy/external URLs pass through completely unchanged (Section 11
 * — no forced migration, existing products keep working exactly as
 * before). Callers never construct imagedelivery.net URLs by hand.
 */
export function resolveMediaUrl(storedUrl: string, variant: SavoImageVariant = "public"): string {
  const imageId = parseCloudflareImageId(storedUrl);
  if (!imageId) return storedUrl; // legacy/external URL — untouched
  return buildCloudflareUrl(imageId, variant);
}
