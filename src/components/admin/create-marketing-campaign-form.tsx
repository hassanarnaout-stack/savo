"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateCampaignForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("PRODUCT");
  const [objective, setObjective] = useState("SALES");
  const [budget, setBudget] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !budget || !startAt || !endAt) return toast.error("Fill in all fields");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/studio/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, objective, budget: parseFloat(budget), startAt, endAt }),
      });
      if (!res.ok) throw new Error();
      toast.success("Campaign created");
      setName("");
      setBudget("");
      router.refresh();
    } catch {
      toast.error("Could not create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-saveo-emerald-700">Create Campaign</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" className="input text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="input text-sm">
          <option value="PRODUCT">Product</option>
          <option value="FLASH_DEAL">Flash Deal</option>
          <option value="MYSTERY_BOX">Mystery Box</option>
          <option value="SAVEO_PLUS">Savo Plus</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="CATEGORY">Category</option>
          <option value="SEASONAL">Seasonal</option>
        </select>
        <select value={objective} onChange={(e) => setObjective(e.target.value)} className="input text-sm">
          <option value="SALES">Sales</option>
          <option value="TRAFFIC">Traffic</option>
          <option value="CUSTOMERS">Customers</option>
          <option value="RETENTION">Retention</option>
          <option value="AWARENESS">Awareness</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Budget (KD)</label>
          <input type="number" step="0.001" value={budget} onChange={(e) => setBudget(e.target.value)} className="input text-sm" />
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
      <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Create Campaign</button>
    </form>
  );
}
