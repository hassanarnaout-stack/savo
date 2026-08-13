"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PackageFeatures {
  maxSponsoredSlots: number;
  productExperience: boolean;
  discoveryScoreBoost: number;
  heroDisplay: boolean;
}

export function PackageEditControls({
  packageId,
  monthlyPrice,
  active,
  features,
}: {
  packageId: string;
  monthlyPrice: number;
  active: boolean;
  features: PackageFeatures;
}) {
  const router = useRouter();
  const [price, setPrice] = useState(monthlyPrice.toString());
  const [saving, setSaving] = useState(false);

  async function update(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/brand-packages/${packageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success("Package updated");
      router.refresh();
    } catch {
      toast.error("Could not update package");
    } finally {
      setSaving(false);
    }
  }

  function toggleFeature(key: keyof PackageFeatures) {
    update({ features: { ...features, [key]: !features[key] } });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number" step="1" value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => update({ monthlyPrice: parseFloat(price) })}
          disabled={saving}
          className="w-24 rounded-lg border border-black/10 px-2 py-1 text-sm"
        />
        <span className="text-xs text-saveo-emerald-700/50">KD/month</span>
        <button
          onClick={() => update({ active: !active })}
          disabled={saving}
          className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}
        >
          {active ? "Active" : "Inactive"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <button onClick={() => toggleFeature("productExperience")} disabled={saving} className={`rounded-full px-2 py-1 ${features.productExperience ? "bg-saveo-gold-100 text-saveo-emerald-800" : "bg-black/5 text-saveo-emerald-700/40"}`}>
          Product Experience
        </button>
        <button onClick={() => toggleFeature("heroDisplay")} disabled={saving} className={`rounded-full px-2 py-1 ${features.heroDisplay ? "bg-saveo-gold-100 text-saveo-emerald-800" : "bg-black/5 text-saveo-emerald-700/40"}`}>
          Hero Display
        </button>
        <span className="rounded-full bg-black/5 px-2 py-1 text-saveo-emerald-700/50">Slots: {features.maxSponsoredSlots}</span>
        <span className="rounded-full bg-black/5 px-2 py-1 text-saveo-emerald-700/50">Score Boost: +{features.discoveryScoreBoost}</span>
      </div>
    </div>
  );
}
