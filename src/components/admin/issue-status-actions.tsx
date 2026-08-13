"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function IssueStatusActions({ issueId, currentStatus }: { issueId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: "OPEN" | "PROCESSING" | "RESOLVED") {
    if (status === currentStatus) return;
    let adminNotes: string | undefined;
    if (status === "RESOLVED") {
      const notes = prompt("Resolution notes (optional):");
      adminNotes = notes || undefined;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!res.ok) throw new Error();
      toast.success("Issue updated");
      router.refresh();
    } catch {
      toast.error("Could not update issue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={currentStatus}
      onChange={(e) => updateStatus(e.target.value as any)}
      disabled={loading}
      className="rounded-lg border border-black/10 px-2 py-1.5 text-xs font-semibold"
    >
      <option value="OPEN">Open</option>
      <option value="PROCESSING">Processing</option>
      <option value="RESOLVED">Resolved</option>
    </select>
  );
}
