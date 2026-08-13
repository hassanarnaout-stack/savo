"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RunBIRollupButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/bi/rollup", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Data warehouse rollup complete");
      router.refresh();
    } catch {
      toast.error("Could not run rollup");
    } finally {
      setRunning(false);
    }
  }

  return (
    <button onClick={run} disabled={running} className="btn-outline text-sm">
      {running ? "Rolling up..." : "Refresh Data Warehouse"}
    </button>
  );
}
