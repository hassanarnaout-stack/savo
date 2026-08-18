"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateBrandControl() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/catalog-brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not create");
      const { brand } = await res.json();
      toast.success("Brand created");
      router.push(`/admin/catalog-brands/${brand.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Could not create");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return <button onClick={() => setOpen(true)} className="rounded bg-saveo-emerald-700 px-4 py-2 text-sm text-white">+ New Brand</button>;

  return (
    <form onSubmit={create} className="flex items-center gap-2">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand name" className="rounded border px-2 py-1.5 text-sm" />
      <button type="submit" disabled={saving} className="rounded bg-saveo-emerald-700 px-3 py-1.5 text-sm text-white">{saving ? "…" : "Create"}</button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-saveo-muted">Cancel</button>
    </form>
  );
}
