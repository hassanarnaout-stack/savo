"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AddMediaForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [type, setType] = useState("GALLERY_IMAGE");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return toast.error("Enter a URL");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, type, url }),
      });
      if (!res.ok) throw new Error();
      toast.success("Media added");
      setUrl("");
      router.refresh();
    } catch {
      toast.error("Could not add media");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-black/5 p-3">
      <select value={type} onChange={(e) => setType(e.target.value)} className="input text-xs">
        <option value="MAIN_IMAGE">Main Image</option>
        <option value="GALLERY_IMAGE">Gallery Image</option>
        <option value="LIFESTYLE_IMAGE">Lifestyle Image</option>
        <option value="VIDEO">Video</option>
        <option value="IMAGE_360">360° Image</option>
      </select>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Media URL" className="input flex-1 text-xs" />
      <button type="submit" disabled={saving} className="btn-primary !py-1.5 text-xs">Add</button>
    </form>
  );
}

export function DeleteMediaButton({ mediaId }: { mediaId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not delete media");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button onClick={handleDelete} disabled={deleting} className="text-xs font-semibold text-red-600 hover:underline">
      Remove
    </button>
  );
}
