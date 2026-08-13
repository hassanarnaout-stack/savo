"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AddLocationForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [zone, setZone] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/warehouse/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, zone }),
      });
      if (!res.ok) throw new Error();
      toast.success("Location added");
      setCode(""); setZone("");
      router.refresh();
    } catch {
      toast.error("Could not add location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (A-01-03)" className="input text-sm" />
      <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone" className="input text-sm" />
      <button type="submit" disabled={saving} className="btn-primary !py-2 text-sm">Add</button>
    </form>
  );
}

export function PutAwayForm({ products, locations }: { products: { id: string; name: string }[]; locations: { id: string; code: string }[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [barcode, setBarcode] = useState("");
  const [saving, setSaving] = useState(false);

  async function scanBarcode(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;
    try {
      const res = await fetch(`/api/admin/warehouse/barcode-lookup?barcode=${encodeURIComponent(barcode.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Not found");
      setProductId(data.product.id);
      toast.success(`Found: ${data.product.name}`);
      setBarcode("");
    } catch (err: any) {
      toast.error(err.message ?? "Barcode not found");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !locationId || !quantity) return toast.error("Fill in all fields");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/warehouse/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUT_AWAY", productId, locationId, quantity: parseInt(quantity, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not put away stock");
      toast.success("Stock put away");
      setQuantity("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not put away stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={scanBarcode} className="mb-2 flex gap-2">
        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type barcode..." className="input text-sm" />
        <button type="submit" className="btn-outline !py-2 text-sm">🔍 Scan</button>
      </form>
      <form onSubmit={submit} className="grid grid-cols-4 gap-2">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
          <option value="">Product...</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="input text-sm">
          <option value="">Location...</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}
        </select>
        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty" className="input text-sm" />
        <button type="submit" disabled={saving} className="btn-primary text-sm">Put Away</button>
      </form>
    </div>
  );
}

export function CreatePickListButton({ supplierOrderId }: { supplierOrderId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/warehouse/pick-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierOrderId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Pick list created");
      router.refresh();
    } catch {
      toast.error("Could not create pick list");
    } finally {
      setSaving(false);
    }
  }

  return <button onClick={create} disabled={saving} className="btn-outline text-xs">Create Pick List</button>;
}

export function PickItemButton({ pickListItemId }: { pickListItemId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function pick() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/warehouse/pick-lists/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PICK_ITEM", pickListItemId }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not mark picked");
    } finally {
      setSaving(false);
    }
  }

  return <button onClick={pick} disabled={saving} className="text-xs font-semibold text-saveo-emerald-600">Mark Picked</button>;
}

export function PackButton({ pickListId }: { pickListId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function pack() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/warehouse/pick-lists/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PACK", pickListId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not pack order");
      toast.success("Order packed and moved to Preparing");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not pack order");
    } finally {
      setSaving(false);
    }
  }

  return <button onClick={pack} disabled={saving} className="btn-primary !py-1.5 text-xs">Pack &amp; Ship</button>;
}
