"use client";

import { useState } from "react";
import { toast } from "sonner";

export function ReturnRequestForm({ orderId }: { orderId: string }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) return toast.error("Please describe the reason for your return");
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/return-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit return request");
      toast.success("Return request submitted — we'll review it shortly");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message ?? "Could not submit return request");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return <p className="text-sm text-saveo-emerald-700/60">Your return request has been submitted and is under review.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-sm font-semibold text-saveo-emerald-700">Request a Return</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Tell us why you'd like to return this order..."
        rows={3}
        maxLength={1000}
        className="input text-sm"
      />
      <button type="submit" disabled={saving} className="btn-outline text-sm">
        {saving ? "Submitting..." : "Submit Return Request"}
      </button>
    </form>
  );
}
