"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function BetaStatusControls({
  initial,
}: {
  initial: { enabled: boolean; inviteOnly: boolean; startDate: string | null; endDate: string | null };
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save(patch: Partial<typeof state>) {
    const next = { ...state, ...patch };
    setState(next);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/beta/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update beta settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Beta Mode</p>
          <p className="text-xs text-saveo-emerald-700/50">{state.enabled ? "Active" : "Disabled — platform behaves normally"}</p>
        </div>
        <button
          onClick={() => save({ enabled: !state.enabled })}
          disabled={saving}
          className={`rounded-full px-4 py-2 text-sm font-bold ${state.enabled ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}
        >
          {state.enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Invite Only</p>
          <p className="text-xs text-saveo-emerald-700/50">Only emails on the Beta Invite list can register</p>
        </div>
        <button
          onClick={() => save({ inviteOnly: !state.inviteOnly })}
          disabled={saving || !state.enabled}
          className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40 ${state.inviteOnly ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}
        >
          {state.inviteOnly ? "Invite Only" : "Open"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Start Date</label>
          <input
            type="date"
            value={state.startDate?.slice(0, 10) ?? ""}
            onChange={(e) => save({ startDate: e.target.value || null })}
            className="input text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">End Date</label>
          <input
            type="date"
            value={state.endDate?.slice(0, 10) ?? ""}
            onChange={(e) => save({ endDate: e.target.value || null })}
            className="input text-sm"
          />
        </div>
      </div>
    </div>
  );
}

export function FeatureFlagToggle({ flagKey, name, enabled }: { flagKey: string; name: string; enabled: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);

  async function toggle() {
    setSaving(true);
    const next = !isEnabled;
    setIsEnabled(next);
    try {
      const res = await fetch(`/api/admin/beta/flags/${flagKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setIsEnabled(!next);
      toast.error("Could not update feature flag");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-black/5 p-3">
      <span className="text-sm font-medium">{name}</span>
      <button
        onClick={toggle}
        disabled={saving}
        className={`rounded-full px-3 py-1 text-xs font-bold ${isEnabled ? "bg-saveo-emerald-700 text-white" : "bg-black/10 text-saveo-emerald-700/50"}`}
      >
        {isEnabled ? "ON" : "OFF"}
      </button>
    </div>
  );
}
