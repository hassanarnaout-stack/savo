"use client";

import { useState } from "react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { Plus } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  isFeatured: boolean;
  isActive: boolean;
  productCount: number;
}

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slugify(name), icon }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setCategories((prev) => [...prev, { ...created, productCount: 0 }]);
      setName("");
      setIcon("");
      toast.success("Category added");
    } catch {
      toast.error("Could not add category");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFeatured(id: string, isFeatured: boolean) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isFeatured } : c)));
    await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured }),
    });
  }

  return (
    <div>
      <form onSubmit={addCategory} className="card mb-6 flex flex-wrap items-end gap-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">Category Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Home & Kitchen"
            className="rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">Icon (emoji)</label>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🏠"
            className="w-20 rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl2 border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-left text-xs uppercase text-saveo-emerald-700/50">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Featured on Homepage</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{c.icon} {c.name}</td>
                <td className="px-4 py-3 text-saveo-emerald-700/50">{c.slug}</td>
                <td className="px-4 py-3">{c.productCount}</td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={c.isFeatured}
                    onChange={(e) => toggleFeatured(c.id, e.target.checked)}
                    className="accent-saveo-emerald-700"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
