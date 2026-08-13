"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Layers } from "lucide-react";

interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count: { products: number };
}

export function AdminCollectionsClient() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchCollections() {
    const res = await fetch("/api/admin/collections");
    const data = await res.json();
    if (res.ok) setCollections(data.collections);
  }

  useEffect(() => {
    fetchCollections();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Collection created");
      setName(""); setSlug("");
      setShowForm(false);
      fetchCollections();
    } catch (err: any) {
      toast.error(err.message ?? "Could not create collection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collections</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> New Collection
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-6 card grid gap-2 p-4 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
            }}
            placeholder="Collection name (e.g. Ramadan Favorites)"
            className="input text-sm sm:col-span-2"
          />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="url-slug" className="input text-sm" />
          <button type="submit" disabled={saving} className="btn-primary text-sm sm:col-span-3">Create</button>
        </form>
      )}

      <div className="space-y-2">
        {collections.map((c) => (
          <Link key={c.id} href={`/admin/collections/${c.id}`} className="flex items-center justify-between rounded-xl2 border border-black/5 bg-white p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-saveo-emerald-700/40" />
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-saveo-emerald-700/50">/{c.slug} · {c._count.products} products</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${c.isActive ? "bg-saveo-emerald-100 text-saveo-emerald-700" : "bg-black/5 text-saveo-emerald-700/40"}`}>
              {c.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </Link>
        ))}
        {collections.length === 0 && <p className="text-sm text-saveo-emerald-700/40">No collections yet.</p>}
      </div>
    </div>
  );
}
