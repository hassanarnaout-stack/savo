"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateDealOfHourForm({ products }: { products: { id: string; name: string; saveoPrice: number }[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [discountOverride, setDiscountOverride] = useState("");
  const [stockLimit, setStockLimit] = useState("10");
  const [durationHours, setDurationHours] = useState("1");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return toast.error("Select a product");
    setSaving(true);
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + parseFloat(durationHours) * 60 * 60 * 1000);

      const res = await fetch("/api/admin/deal-of-the-hour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          discountOverride: discountOverride ? parseInt(discountOverride, 10) : undefined,
          stockLimit: parseInt(stockLimit, 10),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Deal of the Hour is now live on the homepage");
      router.refresh();
    } catch {
      toast.error("Could not create Deal of the Hour");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-saveo-emerald-700">Start a New Deal of the Hour</h2>
      <p className="text-xs text-saveo-emerald-700/50">Only one slot is shown on the homepage at a time — starting a new one replaces the current one.</p>
      <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
        <option value="">Select product...</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name} ({p.saveoPrice.toFixed(3)} KD)</option>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Discount % (optional)</label>
          <input type="number" min="1" max="90" value={discountOverride} onChange={(e) => setDiscountOverride(e.target.value)} placeholder="Product's own" className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">"Only X left"</label>
          <input type="number" min="1" value={stockLimit} onChange={(e) => setStockLimit(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Duration (hours)</label>
          <input type="number" min="0.5" step="0.5" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className="input text-sm" />
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Go Live</button>
    </form>
  );
}

export function DeactivateDealButton({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function deactivate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/deal-of-the-hour/${dealId}`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      toast.success("Deactivated");
      router.refresh();
    } catch {
      toast.error("Could not deactivate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button onClick={deactivate} disabled={saving} className="text-xs font-semibold text-red-600">
      Deactivate
    </button>
  );
}
