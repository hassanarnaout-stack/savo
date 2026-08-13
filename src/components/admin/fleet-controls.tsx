"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AddDriverForm({ partners }: { partners: { id: string; name: string }[] }) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerId) return toast.error("Select a delivery partner company");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/delivery-drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, name, phone }),
      });
      if (!res.ok) throw new Error();
      toast.success("Driver added");
      setName("");
      setPhone("");
      router.refresh();
    } catch {
      toast.error("Could not add driver");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="input text-sm">
        <option value="">Delivery company...</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Driver name" required className="input text-sm" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" required className="input text-sm" />
      <button type="submit" disabled={saving} className="btn-primary !py-2 text-sm">Add Driver</button>
    </form>
  );
}

export function AssignDriverControl({ deliveryId, drivers }: { deliveryId: string; drivers: { id: string; name: string; status: string }[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function assign(driverId: string) {
    if (!driverId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/deliveries/${deliveryId}/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Driver assigned");
      router.refresh();
    } catch {
      toast.error("Could not assign driver");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select onChange={(e) => assign(e.target.value)} disabled={saving} defaultValue="" className="rounded-lg border border-black/10 px-2 py-1.5 text-xs font-semibold">
      <option value="" disabled>Assign driver...</option>
      {drivers.filter((d) => d.status !== "ON_DELIVERY").map((d) => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  );
}
