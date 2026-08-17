/**
 * Cloudflare Images — server-side client. Never imported by client
 * components; the API token never leaves the server.
 *
 * Architecture decision: ProductMedia has no new schema field for the
 * Cloudflare image ID. Cloudflare's delivery URLs are deterministic —
 * `https://imagedelivery.net/{ACCOUNT_HASH}/{IMAGE_ID}/{variant}` — so
 * the image ID is safely recoverable by parsing the URL already stored
 * in ProductMedia.url (see parseCloudflareImageId below). This
 * satisfies "fits existing fields" without inventing a parallel
 * identifier or touching the schema.
 */

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
const CF_ACCOUNT_HASH = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH;

export function isCloudflareImagesConfigured(): boolean {
  return !!(CF_ACCOUNT_ID && CF_API_TOKEN && CF_ACCOUNT_HASH);
}

interface DirectUploadResult {
  uploadURL: string;
  imageId: string;
}

/** Requests a one-time Direct Creator Upload URL. The browser uploads
 * the actual image bytes straight to this URL — the file never passes
 * through our server/application memory. */
export async function requestDirectUpload(metadata: Record<string, string>): Promise<DirectUploadResult> {
  if (!isCloudflareImagesConfigured()) throw new Error("Cloudflare Images is not configured");

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v2/direct_upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    body: (() => {
      const form = new FormData();
      form.append("requireSignedURLs", "false");
      form.append("metadata", JSON.stringify(metadata));
      return form;
    })(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message ?? "Cloudflare direct upload request failed");
  return { uploadURL: data.result.uploadURL, imageId: data.result.id };
}

/** Confirms an image actually exists on Cloudflare (the browser reports
 * success, but we verify server-side before trusting it — an upload
 * URL can be requested and never used, or fail client-side). */
export async function verifyImageExists(imageId: string): Promise<boolean> {
  if (!isCloudflareImagesConfigured()) throw new Error("Cloudflare Images is not configured");
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${imageId}`, {
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.success;
}

export async function deleteCloudflareImage(imageId: string): Promise<{ success: boolean; error?: string }> {
  if (!isCloudflareImagesConfigured()) return { success: false, error: "Cloudflare Images is not configured" };
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${imageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  });
  const data = await res.json();
  if (!data.success) return { success: false, error: data.errors?.[0]?.message ?? "Cloudflare deletion failed" };
  return { success: true };
}

/** SAVO's intentional variant strategy — three variants, matching real
 * usage across the app: `thumb` for cards/rails (Discover, Category,
 * Products, PDP recommendation rails), `main` for the PDP hero image,
 * `public` (Cloudflare's always-available default, full quality) as
 * the safe fallback for anywhere else. These three variant NAMES must
 * also be created once in the Cloudflare dashboard (see setup
 * instructions) — this file only ever references them by name. */
export type SavoImageVariant = "thumb" | "main" | "public";

export function buildCloudflareUrl(imageId: string, variant: SavoImageVariant = "public"): string {
  if (!CF_ACCOUNT_HASH) throw new Error("Cloudflare Images is not configured");
  return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${imageId}/${variant}`;
}

/** Recovers the Cloudflare image ID from a URL already stored in
 * ProductMedia.url — returns null for legacy/external URLs (which are
 * left completely alone; see Section 11 of the spec). */
export function parseCloudflareImageId(url: string): string | null {
  if (!CF_ACCOUNT_HASH) return null;
  const match = url.match(new RegExp(`imagedelivery\\.net/${CF_ACCOUNT_HASH}/([^/]+)/`));
  return match ? match[1] : null;
}
