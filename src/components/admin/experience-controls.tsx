"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ExperienceControls({
  productId,
  experienceType,
  experienceApproved,
  discoveryScore,
}: {
  productId: string;
  experienceType: string;
  experienceApproved: boolean;
  discoveryScore: number | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState(experienceType);
  const [score, setScore] = useState(discoveryScore?.toString() ?? "");

  async function update(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/experience`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success("Updated");
      router.refresh();
    } catch {
      toast.error("Could not update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={type}
        onChange={(e) => { setType(e.target.value); update({ experienceType: e.target.value }); }}
        disabled={saving}
        className="rounded-lg border border-black/10 px-2 py-1.5 text-xs"
      >
        {["STANDARD", "PREMIUM", "LUXURY", "MYSTERY", "FLASH"].map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <input
        type="number" min="0" max="100" value={score}
        onChange={(e) => setScore(e.target.value)}
        onBlur={() => score !== "" && update({ discoveryScore: parseInt(score, 10) })}
        placeholder="Score"
        disabled={saving}
        className="w-16 rounded-lg border border-black/10 px-2 py-1.5 text-xs"
      />
      <button
        onClick={() => update({ experienceApproved: !experienceApproved })}
        disabled={saving}
        className={`rounded-full px-3 py-1.5 text-xs font-bold ${experienceApproved ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}
      >
        {experienceApproved ? "Approved" : "Approve Content"}
      </button>
    </div>
  );
}
