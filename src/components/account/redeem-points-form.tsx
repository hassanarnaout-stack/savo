"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatKWD } from "@/lib/utils";

export function RedeemPointsForm({ availablePoints }: { availablePoints: number }) {
  const router = useRouter();
  const [points, setPoints] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(points, 10);
    if (isNaN(parsed) || parsed <= 0) return toast.error("Enter a valid number of points");
    setSaving(true);
    try {
      const res = await fetch("/api/account/redeem-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not redeem points");
      toast.success(`Redeemed ${data.pointsRedeemed} points for ${formatKWD(data.kdCredited)} wallet credit`);
      setPoints("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not redeem points");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-sm font-semibold text-saveo-emerald-700">Redeem Points (100 pts = 1.000 KD)</p>
      <div className="flex gap-2">
        <input
          type="number" min="1" max={availablePoints}
          value={points} onChange={(e) => setPoints(e.target.value)}
          placeholder={`Up to ${availablePoints} points`}
          className="input text-sm"
        />
        <button type="submit" disabled={saving || availablePoints === 0} className="btn-primary !py-2 text-sm">Redeem</button>
      </div>
    </form>
  );
}
