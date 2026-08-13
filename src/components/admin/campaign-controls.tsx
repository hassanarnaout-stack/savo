"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CampaignActivationToggle({ campaignId, status }: { campaignId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const endpoint = status === "ACTIVE" ? "deactivate" : "activate";
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/${endpoint}`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not update campaign");
      }
      toast.success(status === "ACTIVE" ? "Campaign deactivated" : "Campaign activated");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`rounded-full px-4 py-2 text-sm font-bold ${
        status === "ACTIVE" ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"
      }`}
    >
      {status === "ACTIVE" ? "Deactivate" : "Activate"}
    </button>
  );
}

export function PriorityInput({ campaignId, priority }: { campaignId: string; priority: number }) {
  const router = useRouter();
  const [value, setValue] = useState(priority.toString());
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: parsed }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update priority");
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      disabled={saving}
      className="w-16 rounded border border-black/10 px-2 py-1 text-sm"
    />
  );
}

export function ScheduleControl({ campaignId, startAt, endAt }: { campaignId: string; startAt: string | null; endAt: string | null }) {
  const router = useRouter();
  const [start, setStart] = useState(startAt?.slice(0, 10) ?? "");
  const [end, setEnd] = useState(endAt?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!start) return toast.error("Set a start date");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startAt: start, endAt: end || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Campaign scheduled");
      router.refresh();
    } catch {
      toast.error("Could not schedule campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border border-black/10 px-1.5 py-1 text-xs" />
      <span className="text-xs text-saveo-emerald-700/40">→</span>
      <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded border border-black/10 px-1.5 py-1 text-xs" />
      <button onClick={save} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">Save</button>
    </div>
  );
}
