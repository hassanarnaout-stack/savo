"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function BrandStatusControls({ brandId, status }: { brandId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function setStatus(newStatus: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Brand account updated");
      router.refresh();
    } catch {
      toast.error("Could not update brand account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
        status === "ACTIVE" ? "bg-saveo-emerald-100 text-saveo-emerald-800" :
        status === "SUSPENDED" ? "bg-red-100 text-red-700" :
        "bg-amber-100 text-amber-700"
      }`}>
        {status}
      </span>
      {status !== "ACTIVE" && (
        <button onClick={() => setStatus("ACTIVE")} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">Approve</button>
      )}
      {status !== "SUSPENDED" && (
        <button onClick={() => setStatus("SUSPENDED")} disabled={saving} className="text-xs font-semibold text-red-600">Suspend</button>
      )}
    </div>
  );
}
