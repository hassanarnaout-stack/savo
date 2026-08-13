"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ReportIssueForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not submit report");
      }
      toast.success("We've received your report and will follow up soon.");
      setSubject("");
      setDescription("");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline text-sm">
        Report an issue
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={3}
          maxLength={120}
          placeholder="e.g. Missing item, damaged product, wrong order"
          className="input"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">What happened?</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder="Tell us what went wrong so we can help..."
          className="input"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
