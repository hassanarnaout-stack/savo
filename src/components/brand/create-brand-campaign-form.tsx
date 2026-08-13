"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateBrandCampaignFormClient({ segments }: { segments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [type, setType] = useState("PRODUCT_BOOST");
  const [objective, setObjective] = useState("");
  const [budget, setBudget] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [audienceSegmentId, setAudienceSegmentId] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!objective || !budget || !startAt || !endAt) return toast.error("Fill in all fields");
    setSaving(true);
    try {
      const res = await fetch("/api/brand/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          objective,
          budget: parseFloat(budget),
          startAt,
          endAt,
          audienceSegmentId: audienceSegmentId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create campaign");
      toast.success("Campaign created — an invoice has been issued");
      router.push("/brand");
    } catch (err: any) {
      toast.error(err.message ?? "Could not create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto max-w-lg space-y-3 p-6">
      <h1 className="text-xl font-bold text-saveo-emerald-700">Create Campaign</h1>

      <label className="block text-sm font-semibold text-saveo-emerald-700/70">Campaign Type</label>
      <select value={type} onChange={(e) => setType(e.target.value)} className="input">
        <option value="PRODUCT_BOOST">Product Boost</option>
        <option value="BRAND_TAKEOVER">Brand Takeover</option>
        <option value="MYSTERY_BOX_SPONSOR">Mystery Box Sponsor</option>
        <option value="CATEGORY_CAMPAIGN">Category Campaign</option>
        <option value="CHALLENGE_CAMPAIGN">Challenge Campaign</option>
        <option value="SEASONAL_CAMPAIGN">Seasonal Campaign</option>
      </select>

      <label className="block text-sm font-semibold text-saveo-emerald-700/70">Objective</label>
      <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="e.g. Drive sales for our new arrivals" className="input" />

      <label className="block text-sm font-semibold text-saveo-emerald-700/70">Target Audience</label>
      <select value={audienceSegmentId} onChange={(e) => setAudienceSegmentId(e.target.value)} className="input">
        <option value="">All Savo customers</option>
        {segments.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Budget (KD)</label>
          <input type="number" step="0.001" value={budget} onChange={(e) => setBudget(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Start</label>
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">End</label>
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="input" />
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? "Creating..." : "Create Campaign"}
      </button>
    </form>
  );
}
