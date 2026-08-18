"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrandMediaUpload } from "./brand-media-upload";

interface Brand {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  descriptionAr: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export function CatalogBrandForm({ brand }: { brand: Brand }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: brand.name,
    nameAr: brand.nameAr ?? "",
    description: brand.description ?? "",
    descriptionAr: brand.descriptionAr ?? "",
    isActive: brand.isActive,
    isFeatured: brand.isFeatured,
    sortOrder: brand.sortOrder,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/catalog-brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    <div className="grid max-w-2xl gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium">Name (English)</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Name (Arabic)</label>
          <input value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} dir="rtl" className="w-full rounded border px-2 py-1.5 text-sm" />
        </div>
      </div>
      <div className="text-xs text-saveo-muted">Slug: <code>{brand.slug}</code></div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium">Description (English)</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="w-full rounded border px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Description (Arabic)</label>
          <textarea value={form.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} dir="rtl" rows={3} className="w-full rounded border px-2 py-1.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t pt-4">
        <BrandMediaUpload brandId={brand.id} field="logoUrl" currentUrl={brand.logoUrl} label="Logo" />
        <BrandMediaUpload brandId={brand.id} field="coverImageUrl" currentUrl={brand.coverImageUrl} label="Cover / Editorial Image" />
      </div>

      <div className="flex items-center gap-6 border-t pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Featured
        </label>
        <label className="flex items-center gap-2 text-sm">
          Sort order
          <input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} className="w-20 rounded border px-2 py-1" />
        </label>
      </div>

      <button onClick={save} disabled={saving} className="w-max rounded bg-saveo-emerald-700 px-5 py-2 text-sm text-white">{saving ? "Saving…" : "Save"}</button>
    </div>
  );
}
