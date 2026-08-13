"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AssignPartnerControl({
  supplierOrderId,
  partners,
  currentPartnerId,
}: {
  supplierOrderId: string;
  partners: { id: string; name: string }[];
  currentPartnerId?: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function assign(partnerId: string) {
    if (!partnerId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/deliveries/${supplierOrderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Delivery partner assigned");
      router.refresh();
    } catch {
      toast.error("Could not assign partner");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      defaultValue={currentPartnerId ?? ""}
      onChange={(e) => assign(e.target.value)}
      disabled={saving}
      className="rounded-lg border border-black/10 px-2 py-1.5 text-xs font-semibold"
    >
      <option value="" disabled>Assign partner...</option>
      {partners.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

const STATUS_FLOW = ["READY_FOR_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];

export function DeliveryStatusControl({ deliveryId, currentStatus, hasOtp }: { deliveryId: string; currentStatus: string; hasOtp?: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function updateStatus(status: string) {
    let otpEntered: string | undefined;
    if (status === "DELIVERED" && hasOtp) {
      const entered = prompt("Enter the delivery code the customer gave you:");
      if (!entered) return; // cancelled — don't submit a DELIVERED transition without confirming the code
      otpEntered = entered;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/deliveries/${deliveryId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, otpEntered }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update delivery status");
      toast.success("Delivery status updated");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update delivery status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={currentStatus}
      onChange={(e) => updateStatus(e.target.value)}
      disabled={saving}
      className="rounded-lg border border-black/10 px-2 py-1.5 text-xs font-semibold"
    >
      {STATUS_FLOW.map((s) => (
        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
      ))}
    </select>
  );
}

export function AddPartnerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/delivery-partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (!res.ok) throw new Error();
      toast.success("Delivery partner added");
      setName("");
      setPhone("");
      router.refresh();
    } catch {
      toast.error("Could not add partner");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className="input text-sm" placeholder="e.g. Speedex Kuwait" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="input text-sm" placeholder="+965..." />
      </div>
      <button type="submit" disabled={saving} className="btn-primary !py-2 text-sm">Add Partner</button>
    </form>
  );
}

export function PartnerStatusToggle({ partnerId, status }: { partnerId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/delivery-partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update partner");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status === "ACTIVE" ? "bg-saveo-emerald-100 text-saveo-emerald-800" : "bg-black/5 text-saveo-emerald-700/50"}`}
    >
      {status}
    </button>
  );
}
