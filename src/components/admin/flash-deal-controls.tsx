"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateFlashDealForm({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [stockLimit, setStockLimit] = useState("20");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !startAt || !endAt) return toast.error("Fill in all fields");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/flash-deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          discountPercent: parseInt(discountPercent, 10),
          startAt,
          endAt,
          stockLimit: parseInt(stockLimit, 10),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Flash deal created");
      router.refresh();
    } catch {
      toast.error("Could not create flash deal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-saveo-emerald-700">Create Flash Deal</h2>
      <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
        <option value="">Select product...</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Discount %</label>
          <input type="number" min="1" max="90" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Stock Limit</label>
          <input type="number" min="1" value={stockLimit} onChange={(e) => setStockLimit(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Start</label>
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">End</label>
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="input text-sm" />
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Create Deal</button>
    </form>
  );
}

export function FlashDealControls({ dealId, status }: { dealId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [extending, setExtending] = useState(false);
  const [newEndAt, setNewEndAt] = useState("");

  async function runAction(action: string, extra?: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/flash-deals/${dealId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) throw new Error();
      toast.success("Deal updated");
      setExtending(false);
      router.refresh();
    } catch {
      toast.error("Could not update deal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
        status === "LIVE" ? "bg-saveo-emerald-700 text-white" :
        status === "SCHEDULED" ? "bg-amber-100 text-amber-700" :
        status === "PAUSED" ? "bg-black/10 text-saveo-emerald-700/70" :
        status === "COMPLETED" ? "bg-black/5 text-saveo-emerald-700/40" :
        "bg-black/5 text-saveo-emerald-700/40"
      }`}>
        {status}
      </span>
      {(status === "DRAFT" || status === "SCHEDULED") && (
        <button onClick={() => runAction("START_NOW")} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">Start Now</button>
      )}
      {status === "LIVE" && (
        <button onClick={() => runAction("PAUSE")} disabled={saving} className="text-xs font-semibold text-amber-600">Pause</button>
      )}
      {status === "PAUSED" && (
        <button onClick={() => runAction("RESUME")} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">Resume</button>
      )}
      {(status === "LIVE" || status === "PAUSED" || status === "SCHEDULED") && (
        <button onClick={() => runAction("STOP")} disabled={saving} className="text-xs font-semibold text-red-600">Stop</button>
      )}
      {(status === "LIVE" || status === "PAUSED") && !extending && (
        <button onClick={() => setExtending(true)} className="text-xs font-semibold text-saveo-emerald-700/60">Extend</button>
      )}
      {extending && (
        <span className="flex items-center gap-1">
          <input type="datetime-local" value={newEndAt} onChange={(e) => setNewEndAt(e.target.value)} className="rounded border border-black/10 px-1 py-0.5 text-xs" />
          <button onClick={() => newEndAt && runAction("EXTEND", { newEndAt })} disabled={saving || !newEndAt} className="text-xs font-semibold text-saveo-emerald-600">Save</button>
        </span>
      )}
    </div>
  );
}
