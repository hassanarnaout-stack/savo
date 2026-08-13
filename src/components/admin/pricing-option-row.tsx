"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function PricingOptionRow({
  option,
}: {
  option: { id: string; billingCycle: string; price: number; isActive: boolean };
}) {
  const router = useRouter();
  const [price, setPrice] = useState(option.price.toString());
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed <= 0) return toast.error("Enter a valid price");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/membership/pricing/${option.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: parsed }),
      });
      if (!res.ok) throw new Error();
      toast.success("Price updated");
      router.refresh();
    } catch {
      toast.error("Could not update price");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/membership/pricing/${option.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !option.isActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/5 p-2.5 text-sm">
      <span className="w-16 font-semibold text-saveo-emerald-700">{option.billingCycle}</span>
      <input
        type="number"
        step="0.001"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-24 rounded border border-black/10 px-2 py-1 text-sm"
      />
      <span className="text-xs text-saveo-emerald-700/40">KD</span>
      <button onClick={save} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">
        Save
      </button>
      <button
        onClick={toggleActive}
        disabled={saving}
        className={`ms-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
          option.isActive ? "bg-saveo-emerald-100 text-saveo-emerald-800" : "bg-black/5 text-saveo-emerald-700/50"
        }`}
      >
        {option.isActive ? "Active" : "Inactive"}
      </button>
    </div>
  );
}
