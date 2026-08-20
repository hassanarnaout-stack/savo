"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SubscriptionControls({ subscriptionId, status }: { subscriptionId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handle(action: "PAUSE" | "RESUME" | "CANCEL") {
    setSaving(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success("Subscription updated");
      router.refresh();
    } catch {
      toast.error("Could not update subscription");
    } finally {
      setSaving(false);
    }
  }

  if (status === "CANCELLED") {
    return <span className="savo-sub-cancelled">Cancelled</span>;
  }

  return (
    <div className="savo-sub-controls">
      {status === "ACTIVE" ? (
        <button onClick={() => handle("PAUSE")} disabled={saving} className="savo-sub-btn savo-sub-btn--pause">Pause</button>
      ) : (
        <button onClick={() => handle("RESUME")} disabled={saving} className="savo-sub-btn savo-sub-btn--resume">Resume</button>
      )}
      <button onClick={() => handle("CANCEL")} disabled={saving} className="savo-sub-btn savo-sub-btn--cancel">Cancel</button>
    </div>
  );
}
