"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Reuses the exact same Cloudflare Images Direct Upload flow already
 * built for product media — same accepted types, same size limit,
 * same request→verify→save sequence. One instance handles either
 * `logoUrl` or `coverImageUrl` depending on `field`. */
export function BrandMediaUpload({ brandId, field, currentUrl, label }: { brandId: string; field: "logoUrl" | "coverImageUrl"; currentUrl: string | null; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) return toast.error("Unsupported file type — use JPEG, PNG, WebP, or AVIF");
    if (file.size > MAX_FILE_SIZE) return toast.error("File is larger than 10MB");

    setBusy(true);
    try {
      const reqRes = await fetch(`/api/admin/catalog-brands/${brandId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field }),
      });
      if (!reqRes.ok) throw new Error((await reqRes.json()).error ?? "Could not start upload");
      const { uploadURL, imageId } = await reqRes.json();

      const formData = new FormData();
      formData.append("file", file);
      const cfRes = await fetch(uploadURL, { method: "POST", body: formData });
      if (!cfRes.ok) throw new Error("Upload to Cloudflare failed");

      const confirmRes = await fetch(`/api/admin/catalog-brands/${brandId}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, imageId }),
      });
      if (!confirmRes.ok) throw new Error((await confirmRes.json()).error ?? "Could not confirm upload");
      toast.success(`${label} updated`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove ${label}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/catalog-brands/${brandId}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not remove");
      toast.success(`${label} removed`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {currentUrl && (
        <div className="mb-2 flex items-center gap-3">
          <img src={currentUrl} alt={label} className="h-16 w-16 rounded border object-contain" />
          <button type="button" onClick={handleRemove} disabled={busy} className="text-xs text-red-600">Remove</button>
        </div>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(e) => handleFile(e.target.files?.[0])} className="text-sm" />
    </div>
  );
}
