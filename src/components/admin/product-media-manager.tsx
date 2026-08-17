"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  type: "MAIN_IMAGE" | "GALLERY_IMAGE" | "LIFESTYLE_IMAGE" | "VIDEO" | "IMAGE_360" | "THREE_D_MODEL";
  url: string;
  sortOrder: number;
}

type UploadStatus = "uploading" | "confirming" | "done" | "error";
interface UploadingFile {
  key: string;
  name: string;
  status: UploadStatus;
  error?: string;
  previewUrl: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const CONCURRENCY = 3;

/**
 * PRODUCT MEDIA — reused by both admin and supplier product edit pages
 * (only `apiBase` differs; ownership is always enforced server-side by
 * whichever route actually receives the request).
 *
 * Real Cloudflare Images Direct Creator Upload: the browser uploads
 * image bytes straight to Cloudflare (never through this app's
 * server), then this component asks SAVO to verify + create the
 * ProductMedia row. "Add from URL" remains as a secondary fallback for
 * migration/legacy — never removed per spec.
 */
export function ProductMediaManager({ productId, apiBase, initialMedia }: { productId: string; apiBase: string; initialMedia: MediaItem[] }) {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>(initialMedia.sort((a, b) => a.sortOrder - b.sortOrder));
  const [uploads, setUploads] = useState<UploadingFile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const dragIndex = useRef<number | null>(null);

  async function uploadOne(file: File) {
    const key = `${file.name}-${Date.now()}-${Math.random()}`;
    const previewUrl = URL.createObjectURL(file);
    setUploads((prev) => [...prev, { key, name: file.name, status: "uploading", previewUrl }]);

    try {
      if (!ACCEPTED_TYPES.includes(file.type)) throw new Error("Unsupported file type — use JPEG, PNG, WebP, or AVIF");
      if (file.size > MAX_FILE_SIZE) throw new Error("File is larger than 10MB");

      const reqRes = await fetch(`${apiBase}/${productId}/media/request-upload`, { method: "POST" });
      if (!reqRes.ok) throw new Error((await reqRes.json()).error ?? "Could not start upload");
      const { uploadURL, imageId } = await reqRes.json();

      const formData = new FormData();
      formData.append("file", file);
      const cfRes = await fetch(uploadURL, { method: "POST", body: formData });
      if (!cfRes.ok) throw new Error("Upload to Cloudflare failed");

      setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, status: "confirming" } : u)));

      const hasMain = media.some((m) => m.type === "MAIN_IMAGE");
      const confirmRes = await fetch(`${apiBase}/${productId}/media/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, type: hasMain ? "GALLERY_IMAGE" : "MAIN_IMAGE" }),
      });
      if (!confirmRes.ok) throw new Error((await confirmRes.json()).error ?? "Could not confirm upload");
      const { media: newMedia } = await confirmRes.json();

      setMedia((prev) => [...prev, newMedia]);
      setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, status: "done" } : u)));
    } catch (err: any) {
      setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, status: "error", error: err.message } : u)));
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    for (let i = 0; i < list.length; i += CONCURRENCY) {
      await Promise.all(list.slice(i, i + CONCURRENCY).map(uploadOne));
    }
    router.refresh();
  }

  async function handleAddUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/${productId}/media/confirm-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim(), type: media.some((m) => m.type === "MAIN_IMAGE") ? "GALLERY_IMAGE" : "MAIN_IMAGE" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not add image");
      const { media: newMedia } = await res.json();
      setMedia((prev) => [...prev, newMedia]);
      setUrlInput("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not add image");
    } finally {
      setBusy(false);
    }
  }

  async function setMain(item: MediaItem) {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/${productId}/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "MAIN_IMAGE" }),
      });
      if (!res.ok) throw new Error();
      setMedia((prev) => prev.map((m) => ({ ...m, type: m.id === item.id ? "MAIN_IMAGE" : m.type === "MAIN_IMAGE" ? "GALLERY_IMAGE" : m.type })));
      toast.success("Main image updated");
    } catch {
      toast.error("Could not set main image");
    } finally {
      setBusy(false);
    }
  }

  async function removeMedia(item: MediaItem) {
    if (!confirm("Remove this image?")) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/${productId}/media/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not delete");
      setMedia((prev) => prev.filter((m) => m.id !== item.id));
      toast.success("Removed");
    } catch (err: any) {
      toast.error(err.message ?? "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  async function persistOrder(newOrder: MediaItem[]) {
    setMedia(newOrder);
    await Promise.all(newOrder.map((m, i) => fetch(`${apiBase}/${productId}/media/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: i }) })));
  }

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }
  function handleDragOverItem(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    const reordered = [...media];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(index, 0, moved);
    dragIndex.current = index;
    setMedia(reordered);
  }
  function handleDragEnd() {
    if (dragIndex.current !== null) persistOrder(media);
    dragIndex.current = null;
  }

  return (
    <div className="mt-8 border-t pt-6">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-saveo-muted">Product Media</h2>
      <p className="mb-4 text-xs text-saveo-muted">Upload a high-quality square source image — SAVO generates the right size automatically wherever it's shown. Drag to reorder; the first image is used as Main unless you set another.</p>

      <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="mb-4 rounded border-2 border-dashed p-8 text-center">
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => handleFiles(e.target.files)} />
        <p className="mt-2 text-xs text-saveo-muted">Or drag & drop images here — JPEG, PNG, WebP, AVIF, up to 10MB each</p>
      </div>

      {uploads.filter((u) => u.status !== "done").length > 0 && (
        <div className="mb-4 space-y-1">
          {uploads.filter((u) => u.status !== "done").map((u) => (
            <div key={u.key} className="flex items-center gap-2 text-xs">
              <img src={u.previewUrl} alt="" className="h-8 w-8 rounded object-cover" />
              <span className="flex-1 truncate">{u.name}</span>
              <span className={u.status === "error" ? "text-red-600" : "text-saveo-muted"}>{u.status === "error" ? u.error : u.status}</span>
            </div>
          ))}
        </div>
      )}

      {media.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {media.map((item, index) => (
            <div key={item.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOverItem(e, index)} onDragEnd={handleDragEnd} className="relative cursor-move rounded border p-1">
              {item.type === "VIDEO" ? (
                <video src={item.url} className="h-24 w-full rounded object-cover" />
              ) : (
                <img src={item.url} alt="" className="h-24 w-full rounded object-cover" />
              )}
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className={item.type === "MAIN_IMAGE" ? "font-bold text-saveo-emerald-700" : "text-saveo-muted"}>{item.type === "MAIN_IMAGE" ? "MAIN" : item.type.replace("_", " ")}</span>
                <button onClick={() => removeMedia(item)} disabled={busy} className="text-red-600">✕</button>
              </div>
              {item.type !== "MAIN_IMAGE" && item.type !== "VIDEO" && (
                <button onClick={() => setMain(item)} disabled={busy} className="mt-1 w-full text-[10px] text-saveo-emerald-700 underline">Set as main</button>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAddUrl} className="flex max-w-md gap-2">
        <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Or add from URL (legacy/migration)" className="flex-1 rounded border px-2 py-1.5 text-sm" />
        <button type="submit" disabled={busy} className="rounded border px-3 py-1.5 text-sm">Add</button>
      </form>
    </div>
  );
}
