"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreatePOForm({ suppliers, products }: { suppliers: { id: string; companyName: string }[]; products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantityOrdered, setQuantityOrdered] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || !productId || !quantityOrdered || !unitCost) return toast.error("Fill in all fields");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/warehouse/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          items: [{ productId, quantityOrdered: parseInt(quantityOrdered, 10), unitCost: parseFloat(unitCost) }],
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Purchase order created (Draft)");
      setProductId(""); setQuantityOrdered(""); setUnitCost("");
      router.refresh();
    } catch {
      toast.error("Could not create purchase order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-5 gap-2">
      <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input text-sm">
        <option value="">Supplier...</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.companyName}</option>)}
      </select>
      <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
        <option value="">Product...</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input type="number" min="1" value={quantityOrdered} onChange={(e) => setQuantityOrdered(e.target.value)} placeholder="Qty" className="input text-sm" />
      <input type="number" step="0.001" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="Unit cost" className="input text-sm" />
      <button type="submit" disabled={saving} className="btn-primary text-sm">Create PO</button>
    </form>
  );
}

export function POStatusButtons({ poId, status }: { poId: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function act(action: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/warehouse/purchase-orders/${poId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success("Updated");
      router.refresh();
    } catch {
      toast.error("Could not update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-1.5">
      {status === "DRAFT" && <button onClick={() => act("SEND")} disabled={saving} className="btn-outline !py-1 text-xs">Send</button>}
      {status === "SENT" && <button onClick={() => act("CONFIRM")} disabled={saving} className="btn-outline !py-1 text-xs">Confirm</button>}
      {(status === "DRAFT" || status === "SENT") && <button onClick={() => act("CANCEL")} disabled={saving} className="text-xs font-semibold text-red-500">Cancel</button>}
    </div>
  );
}

export function ReceivePOButton({ poId, items }: { poId: string; items: { productId: string; name: string; quantityOrdered: number }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function receive() {
    const receivedItems = items
      .filter((i) => quantities[i.productId] && parseInt(quantities[i.productId], 10) > 0)
      .map((i) => ({ productId: i.productId, quantity: parseInt(quantities[i.productId], 10) }));
    if (receivedItems.length === 0) return toast.error("Enter at least one received quantity");

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/warehouse/purchase-orders/${poId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RECEIVE", receivedItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not receive");
      toast.success("Goods receipt created — stock updated");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not receive");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <button onClick={() => setOpen(true)} className="btn-primary !py-1 text-xs">Receive</button>;

  return (
    <div className="mt-2 space-y-1.5 rounded-lg bg-black/[0.03] p-2">
      {items.map((i) => (
        <div key={i.productId} className="flex items-center justify-between gap-2 text-xs">
          <span>{i.name} (ordered {i.quantityOrdered})</span>
          <input
            type="number" min="0" max={i.quantityOrdered}
            value={quantities[i.productId] ?? ""}
            onChange={(e) => setQuantities((q) => ({ ...q, [i.productId]: e.target.value }))}
            className="input w-20 !py-1 text-xs"
          />
        </div>
      ))}
      <button onClick={receive} disabled={saving} className="btn-primary w-full !py-1 text-xs">Confirm Receipt</button>
    </div>
  );
}
