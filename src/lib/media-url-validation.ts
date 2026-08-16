/**
 * SAVO Media Policy V1 — URL-based validation.
 *
 * Supplier and Admin still paste a media URL rather than uploading a
 * file (no storage provider exists yet — see the Phase A audit). This
 * validates only what a URL string genuinely reveals: well-formed
 * URL, safe protocol, and a plausible file extension when one is
 * present. It intentionally does NOT fetch the URL server-side to
 * inspect real MIME type or dimensions — that would mean the server
 * makes outbound requests to arbitrary user-supplied hosts, a classic
 * SSRF vector. Real MIME/dimension/file-size validation requires the
 * future upload pipeline (Phase A, item K/L) and is out of scope here.
 */

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif", "gif"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];

export type MediaUrlKind = "image" | "video" | "unknown";

export interface MediaUrlValidation {
  valid: boolean;
  error?: string;
  /** Best-effort guess from the extension; "unknown" for CDN URLs with
   * no extension in the path — that's expected and NOT an error, many
   * legitimate media CDNs serve extension-less URLs. */
  kind: MediaUrlKind;
}

export function validateMediaUrl(input: string, expected?: "image" | "video"): MediaUrlValidation {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, error: "Enter a media URL", kind: "unknown" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Not a valid URL", kind: "unknown" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only http:// or https:// media URLs are supported", kind: "unknown" };
  }

  const extMatch = parsed.pathname.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch?.[1]?.toLowerCase();

  let kind: MediaUrlKind = "unknown";
  if (ext) {
    if (IMAGE_EXTENSIONS.includes(ext)) kind = "image";
    else if (VIDEO_EXTENSIONS.includes(ext)) kind = "video";
  }

  // Only reject when the extension is present AND clearly wrong for
  // what's expected (e.g. a .pdf/.exe pasted into an image field).
  // No extension at all is common for CDN-hosted media and is fine.
  if (ext && kind === "unknown") {
    return { valid: false, error: `".${ext}" doesn't look like a supported image or video file`, kind };
  }
  if (expected && kind !== "unknown" && kind !== expected) {
    return { valid: false, error: `This looks like a ${kind} file, but a ${expected} was expected`, kind };
  }

  return { valid: true, kind };
}
