"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { Product360Viewer } from "@/components/product/product-360-viewer";

interface Frame {
  id: string;
  url: string;
  sortOrder: number;
}

export function Product360FrameManager({ productId, frames }: { productId: string; frames: Frame[] }) {
  const router = useRouter();
  const [bulkUrls, setBulkUrls] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [localOrder, setLocalOrder] = useState<Frame[]>(frames);

  if (frames !== localOrder && frames.map((f) => f.id).join() !== localOrder.map((f) => f.id).join() && !saving) {
    setLocalOrder(frames);
  }

  async function addFrames(e: React.FormEvent) {
    e.preventDefault();
    const urls = bulkUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) return toast.error("Paste at least one image URL");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/360-frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, urls }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${urls.length} frame(s) added`);
      setBulkUrls("");
      router.refresh();
    } catch {
      toast.error("Could not add frames — check that every line is a valid image URL");
    } finally {
      setSaving(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...localOrder];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLocalOrder(next);
  }

  async function saveOrder() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products/360-frames/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: localOrder.map((f) => f.id) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Frame order saved");
      router.refresh();
    } catch {
      toast.error("Could not save order");
    } finally {
      setSaving(false);
    }
  }

  async function removeFrame(mediaId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Frame removed");
      router.refresh();
    } catch {
      toast.error("Could not remove frame");
    } finally {
      setSaving(false);
    }
  }

  const orderChanged = localOrder.map((f) => f.id).join() !== frames.map((f) => f.id).join();

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-saveo-emerald-700">🔄 360° Frame Sequence</h2>
        {localOrder.length > 0 && (
          <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1 text-xs font-semibold text-saveo-emerald-600">
            <Eye className="h-3.5 w-3.5" /> {showPreview ? "Hide" : "Live"} Preview
          </button>
        )}
      </div>

      {showPreview && localOrder.length > 0 && (
        <div className="mb-4 max-w-xs">
          <Product360Viewer frames={localOrder} />
          <p className="mt-1 text-center text-[10px] text-saveo-emerald-700/40">This is exactly what customers will see — drag to test the current order.</p>
        </div>
      )}

      <div className="mb-4 space-y-1.5">
        {localOrder.map((frame, i) => (
          <div key={frame.id} className="flex items-center gap-2 rounded-lg bg-black/[0.03] px-2.5 py-1.5">
            <span className="w-5 text-center text-xs font-bold text-saveo-emerald-700/40">{i + 1}</span>
            <img src={frame.url} alt="" className="h-8 w-8 rounded object-cover" />
            <span className="flex-1 truncate text-xs text-saveo-emerald-700/60">{frame.url}</span>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="text-saveo-emerald-700/40 disabled:opacity-20" aria-label="Move up"><ChevronUp className="h-4 w-4" /></button>
            <button onClick={() => move(i, 1)} disabled={i === localOrder.length - 1} className="text-saveo-emerald-700/40 disabled:opacity-20" aria-label="Move down"><ChevronDown className="h-4 w-4" /></button>
            <button onClick={() => removeFrame(frame.id)} aria-label="Remove"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
          </div>
        ))}
        {localOrder.length === 0 && <p className="text-xs text-saveo-emerald-700/40">No 360° frames yet — add some below.</p>}
      </div>

      {orderChanged && (
        <button onClick={saveOrder} disabled={saving} className="btn-primary mb-4 w-full text-sm">Save New Order</button>
      )}

      <form onSubmit={addFrames} className="space-y-2 border-t border-black/5 pt-4">
        <label className="block text-xs font-semibold text-saveo-emerald-700/70">Add frames — one image URL per line, in rotation order</label>
        <textarea
          value={bulkUrls}
          onChange={(e) => setBulkUrls(e.target.value)}
          placeholder={"https://.../frame-01.jpg\nhttps://.../frame-02.jpg\nhttps://.../frame-03.jpg"}
          rows={4}
          className="input text-xs"
        />
        <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Add Frames</button>
        <p className="text-[10px] text-saveo-emerald-700/40">Recommended: 8–24 frames shot at even rotation intervals for a smooth spin.</p>
      </form>
    </div>
  );
}
