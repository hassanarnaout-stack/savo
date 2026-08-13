"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateAutomationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("AFTER_PURCHASE");
  const [action, setAction] = useState("EMAIL");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return toast.error("Give this automation a name");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, trigger, action }),
      });
      if (!res.ok) throw new Error();
      toast.success("Automation created");
      setName("");
      router.refresh();
    } catch {
      toast.error("Could not create automation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Automation name" className="input text-sm" />
      <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="input text-sm">
        <option value="AFTER_PURCHASE">After Purchase</option>
        <option value="PRODUCT_RESTOCK">Product Restock</option>
        <option value="CUSTOMER_INACTIVE">Customer Inactive</option>
        <option value="CART_ABANDONED">Cart Abandoned</option>
        <option value="BIRTHDAY">Birthday</option>
      </select>
      <select value={action} onChange={(e) => setAction(e.target.value)} className="input text-sm">
        <option value="EMAIL">Email</option>
        <option value="DISCOUNT">Discount</option>
        <option value="PUSH">Push</option>
      </select>
      <button type="submit" disabled={saving} className="btn-primary !py-2 text-sm">Create</button>
    </form>
  );
}

export function AutomationToggle({ automationId, active }: { automationId: string; active: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/automations/${automationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update automation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button onClick={toggle} disabled={saving} className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}>
      {active ? "Active" : "Paused"}
    </button>
  );
}

export function RunScanButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/automations/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success(`Scan complete — ${data.triggered} automation(s) triggered`);
      router.refresh();
    } catch {
      toast.error("Could not run scan");
    } finally {
      setRunning(false);
    }
  }

  return (
    <button onClick={run} disabled={running} className="btn-outline text-sm">
      {running ? "Scanning..." : "Run Scheduled Scan Now"}
    </button>
  );
}
