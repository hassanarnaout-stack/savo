"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const PLACEMENTS = [
  { value: "HOMEPAGE_TOP", label: "Homepage Top" },
  { value: "SEARCH_TOP", label: "Search Ads" },
  { value: "CATEGORY_TOP", label: "Sponsored Category" },
  { value: "TRENDING", label: "Trending Rail" },
  { value: "RECOMMENDED", label: "Recommendation Ads" },
  { value: "FLASH_SECTION", label: "Flash Deals Section" },
  { value: "DEAL_BOOST", label: "Deal Boost" },
];

export function CreateSponsoredSlotForm({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [placementType, setPlacementType] = useState("HOMEPAGE_TOP");
  const [budget, setBudget] = useState("");
  const [cpc, setCpc] = useState("");
  const [cpm, setCpm] = useState("");
  const [dailySpendLimit, setDailySpendLimit] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !budget || !startAt || !endAt) return toast.error("Fill in product, budget, and dates");
    if (!cpc && !cpm) return toast.error("Set at least one of CPC or CPM");

    setSaving(true);
    try {
      const res = await fetch("/api/brand/sponsored-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId, placementType, budget: parseFloat(budget),
          cpc: cpc ? parseFloat(cpc) : undefined,
          cpm: cpm ? parseFloat(cpm) : undefined,
          dailySpendLimit: dailySpendLimit ? parseFloat(dailySpendLimit) : undefined,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create campaign");
      toast.success("Campaign submitted — pending admin approval before it goes live");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
          <option value="">Product to sponsor...</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={placementType} onChange={(e) => setPlacementType(e.target.value)} className="input text-sm">
          {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <input type="number" step="0.001" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Total budget (KD)" className="input text-sm" />
        <input type="number" step="0.0001" min="0" value={cpc} onChange={(e) => setCpc(e.target.value)} placeholder="CPC (optional)" className="input text-sm" />
        <input type="number" step="0.0001" min="0" value={cpm} onChange={(e) => setCpm(e.target.value)} placeholder="CPM (optional)" className="input text-sm" />
        <input type="number" step="0.001" min="0" value={dailySpendLimit} onChange={(e) => setDailySpendLimit(e.target.value)} placeholder="Daily cap (optional)" className="input text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="input text-sm" />
        <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="input text-sm" />
      </div>
      <p className="text-xs text-saveo-emerald-700/50">Set either CPC (per click) or CPM (per 1000 impressions), or both. The full budget is invoiced immediately upon submission; every campaign requires admin approval before it goes live.</p>
      <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Submit for Approval</button>
    </form>
  );
}
