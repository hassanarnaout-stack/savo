"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  image: string | null;
}

function SlotPicker({
  label, products, value, onChange,
}: {
  label: string;
  products: Product[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const selected = products.find((p) => p.id === value);
  return (
    <div className="rounded border p-4">
      <h3 className="mb-1 text-sm font-bold uppercase text-saveo-muted">{label}</h3>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-black/5">
          {selected?.image ? <img src={selected.image} alt={selected.name} className="h-full w-full object-cover" /> : null}
        </div>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="flex-1 rounded border px-2 py-1.5 text-sm"
        >
          <option value="">— None —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function LoginShowcaseControls({
  products, initial,
}: {
  products: Product[];
  initial: { leftProductId: string | null; centerProductId: string | null; rightProductId: string | null };
}) {
  const router = useRouter();
  const [left, setLeft] = useState(initial.leftProductId);
  const [center, setCenter] = useState(initial.centerProductId);
  const [right, setRight] = useState(initial.rightProductId);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/login-showcase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leftProductId: left, centerProductId: center, rightProductId: right }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save");
      toast.success("Saved");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <SlotPicker label="Left Product" products={products} value={left} onChange={setLeft} />
      <SlotPicker label="Center Product" products={products} value={center} onChange={setCenter} />
      <SlotPicker label="Right Product" products={products} value={right} onChange={setRight} />
      <button onClick={save} disabled={saving} className="rounded bg-saveo-emerald-700 px-4 py-1.5 text-sm text-white">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
