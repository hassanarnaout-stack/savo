"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function HomepageSettingsControls({ initialHeroProductCount }: { initialHeroProductCount: number }) {
  const router = useRouter();
  const [count, setCount] = useState(initialHeroProductCount);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroProductCount: count }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save");
      toast.success("Saved");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md rounded border p-4">
      <h2 className="mb-1 text-sm font-bold uppercase text-saveo-muted">Hero Discovery Display</h2>
      <p className="mb-4 text-xs text-saveo-muted">How many real products rotate in the homepage Hero's large display card (1–8). Changes apply the next time the homepage loads.</p>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={8}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
          className="w-20 rounded border px-2 py-1.5 text-sm"
        />
        <button onClick={save} disabled={saving} className="rounded bg-saveo-emerald-700 px-4 py-1.5 text-sm text-white">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
