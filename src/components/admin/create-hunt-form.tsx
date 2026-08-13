"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateHuntForm({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [maxWinners, setMaxWinners] = useState("10");
  const [rewardLabel, setRewardLabel] = useState("2.000 KD Credit");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !startAt || !endAt) return toast.error("Fill in all fields");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/hunts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, maxWinners: parseInt(maxWinners, 10), rewardLabel, startAt, endAt }),
      });
      if (!res.ok) throw new Error();
      toast.success("Hunt created — activate it below (subject to the 2-active-campaigns limit)");
      router.refresh();
    } catch {
      toast.error("Could not create hunt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6 space-y-3 p-5">
      <h2 className="font-bold text-saveo-emerald-700">Create Limited Time Hunt</h2>
      <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
        <option value="">Select hidden-deal product...</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Max Winners</label>
          <input type="number" min="1" value={maxWinners} onChange={(e) => setMaxWinners(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Reward Label</label>
          <input value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} className="input text-sm" />
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
      <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Create Hunt (starts inactive)</button>
    </form>
  );
}
