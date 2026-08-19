"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const BENEFIT_KEYS = ["EXTRA_DISCOUNT", "EARLY_ACCESS", "EXCLUSIVE_DEALS", "FREE_DELIVERY", "PLUS_BADGE", "MYSTERY_BOX_BONUS", "DOUBLE_REWARD_POINTS"];

export function CreateBenefitControl({ planId, existingKeys }: { planId: string; existingKeys: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(BENEFIT_KEYS.find((k) => !existingKeys.includes(k)) ?? BENEFIT_KEYS[0]);
  const [label, setLabel] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [saving, setSaving] = useState(false);

  const availableKeys = BENEFIT_KEYS.filter((k) => !existingKeys.includes(k));

  async function create() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/membership/benefits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, key, label: label || null, labelAr: labelAr || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not add benefit");
      }
      toast.success("Benefit added");
      setOpen(false);
      setLabel("");
      setLabelAr("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not add benefit");
    } finally {
      setSaving(false);
    }
  }

  if (availableKeys.length === 0) return null; // every real key already on this plan

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-saveo-emerald-600">
        + Add benefit
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-saveo-emerald-300 p-2.5 text-sm">
      <select value={key} onChange={(e) => setKey(e.target.value)} className="rounded border border-black/10 px-1.5 py-1 text-xs">
        {availableKeys.map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <input type="text" placeholder="Label (EN)" value={label} onChange={(e) => setLabel(e.target.value)} className="w-28 rounded border border-black/10 px-1.5 py-1 text-xs" />
      <input type="text" placeholder="Label (AR)" dir="rtl" value={labelAr} onChange={(e) => setLabelAr(e.target.value)} className="w-28 rounded border border-black/10 px-1.5 py-1 text-xs" />
      <button onClick={create} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">
        {saving ? "Adding…" : "Add"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-saveo-emerald-700/50">
        Cancel
      </button>
    </div>
  );
}
