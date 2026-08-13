"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RunPerformanceEvaluationButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/supplier-performance/evaluate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success(`Evaluated ${data.evaluated} supplier(s)`);
      router.refresh();
    } catch {
      toast.error("Could not run evaluation");
    } finally {
      setRunning(false);
    }
  }

  return (
    <button onClick={run} disabled={running} className="btn-outline text-sm">
      {running ? "Evaluating..." : "Run Evaluation Now"}
    </button>
  );
}
