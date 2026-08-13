"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function PlanBenefitRow({
  benefit,
}: {
  benefit: { id: string; key: string; isEnabled: boolean; value: number | null; label: string | null };
}) {
  const router = useRouter();
  const [value, setValue] = useState(benefit.value?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/membership/benefits/${benefit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !benefit.isEnabled }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update benefit");
    } finally {
      setSaving(false);
    }
  }

  async function saveValue() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/membership/benefits/${benefit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: value === "" ? null : parseFloat(value) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Value updated");
      router.refresh();
    } catch {
      toast.error("Could not update value");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/5 p-2.5 text-sm">
      <button
        onClick={toggle}
        disabled={saving}
        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
          benefit.isEnabled ? "bg-saveo-emerald-100 text-saveo-emerald-800" : "bg-black/5 text-saveo-emerald-700/50"
        }`}
      >
        {benefit.isEnabled ? "ON" : "OFF"}
      </button>
      <span className="flex-1 text-xs font-medium text-saveo-emerald-800">{benefit.label ?? benefit.key.replace(/_/g, " ")}</span>
      <input
        type="number"
        step="0.01"
        placeholder="value"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-16 rounded border border-black/10 px-1.5 py-1 text-xs"
      />
      <button onClick={saveValue} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">
        Save
      </button>
    </div>
  );
}
