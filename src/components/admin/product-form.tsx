"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { calcDiscountPct, slugify } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  companyName: string;
}

interface CatalogBrand {
  id: string;
  name: string;
}

export interface ProductFormValues {
  id?: string;
  name: string;
  slug: string;
  brandName?: string;
  brandId?: string | null;
  isSubscribable?: boolean;
  description: string;
  categoryId: string;
  supplierId: string;
  type: "STANDARD" | "DEAL" | "MYSTERY_BOX" | "RESCUE";
  originalPrice: string;
  saveoPrice: string;
  stockQty: string;
  lowStockAlert: string;
  dealEndsAt: string;
  expiryDate: string;
  imageUrl: string;
  mysteryBoxReveal: string;
  mysteryBoxValueMin?: string;
  mysteryBoxValueMax?: string;
  mysteryBoxTier?: string;
  mysteryBoxLockedCount?: string;
  mysteryBoxChooseCount?: string;
}

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  supplierId: "",
  type: "STANDARD",
  originalPrice: "",
  saveoPrice: "",
  stockQty: "0",
  lowStockAlert: "5",
  dealEndsAt: "",
  expiryDate: "",
  imageUrl: "",
  mysteryBoxReveal: "",
};

export function ProductForm({
  categories,
  suppliers,
  catalogBrands,
  initial,
}: {
  categories: Category[];
  suppliers: Supplier[];
  catalogBrands: CatalogBrand[];
  initial?: ProductFormValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);

  const discount = calcDiscountPct(Number(form.originalPrice) || 0, Number(form.saveoPrice) || 0);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value, ...(key === "name" && !f.id ? { slug: slugify(value as string) } : {}) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(form.id ? `/api/admin/products/${form.id}` : "/api/admin/products", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(form.id ? "Product updated" : "Product created");
      router.push("/admin/products");
      router.refresh();
    } catch {
      toast.error("Could not save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="font-bold">Basic Information</h2>
        <Field label="Product Name">
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="input" />
        </Field>
        <Field label="Slug (URL)">
          <input required value={form.slug} onChange={(e) => set("slug", e.target.value)} className="input" />
        </Field>
        <Field label="Catalog Brand (select an approved brand — auto-fills the field below)">
          <select
            value={form.brandId ?? ""}
            onChange={(e) => {
              const selected = catalogBrands.find((b) => b.id === e.target.value);
              set("brandId", e.target.value || null);
              if (selected) set("brandName", selected.name);
            }}
            className="input"
          >
            <option value="">— Not linked to a Catalog Brand —</option>
            {catalogBrands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Brand Name (optional — e.g. Lindt, KitKat. Powers the customer-facing Brand District pages; never the supplier's name.)">
          <input value={form.brandName ?? ""} onChange={(e) => set("brandName", e.target.value)} className="input" />
        </Field>
        <Field label="Subscribe & Save">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.isSubscribable} onChange={(e) => set("isSubscribable", e.target.checked)} />
            Allow customers to subscribe & save 10% on this product (recommend leaving off for products that already have their own discount)
          </label>
        </Field>
        <Field label="Description">
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Category">
          <select required value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="input">
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Supplier">
          <select required value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)} className="input">
            <option value="">Select a supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.companyName}</option>
            ))}
          </select>
        </Field>
        <Field label="Product Type">
          <select value={form.type} onChange={(e) => set("type", e.target.value as any)} className="input">
            <option value="STANDARD">Standard</option>
            <option value="DEAL">Savo Deal (time-limited)</option>
            <option value="MYSTERY_BOX">Mystery Box</option>
            <option value="RESCUE">Savo Rescue Deal (near-expiry)</option>
          </select>
        </Field>
        <Field label="Primary Image URL">
          <input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} className="input" placeholder="https://..." />
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">Pricing & Stock</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Original Price (KD)">
            <input
              required
              type="number"
              step="0.001"
              value={form.originalPrice}
              onChange={(e) => set("originalPrice", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Savo Price (KD)">
            <input
              required
              type="number"
              step="0.001"
              value={form.saveoPrice}
              onChange={(e) => set("saveoPrice", e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <p className="text-sm">
          Discount:{" "}
          <span className="font-bold text-saveo-emerald-600">{discount}%</span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Stock Quantity">
            <input
              required
              type="number"
              value={form.stockQty}
              onChange={(e) => set("stockQty", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Low Stock Alert Threshold">
            <input
              type="number"
              value={form.lowStockAlert}
              onChange={(e) => set("lowStockAlert", e.target.value)}
              className="input"
            />
          </Field>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">Deal Settings</h2>
        <Field label="Deal Expiration (countdown target)">
          <input
            type="datetime-local"
            value={form.dealEndsAt}
            onChange={(e) => set("dealEndsAt", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Product Expiry Date (optional)">
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => set("expiryDate", e.target.value)}
            className="input"
          />
        </Field>
        {form.type === "MYSTERY_BOX" && (
          <>
            <Field label="Mystery Box Reveal Text">
              <textarea
                rows={2}
                value={form.mysteryBoxReveal}
                onChange={(e) => set("mysteryBoxReveal", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Guaranteed Minimum Value (KD) — shown to customers as 'worth at least X'">
              <input
                type="number" step="0.001"
                value={form.mysteryBoxValueMin ?? ""}
                onChange={(e) => set("mysteryBoxValueMin", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Guaranteed Maximum Value (KD) — internal planning, not shown to customers">
              <input
                type="number" step="0.001"
                value={form.mysteryBoxValueMax ?? ""}
                onChange={(e) => set("mysteryBoxValueMax", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Tier">
              <select value={form.mysteryBoxTier ?? "BRONZE"} onChange={(e) => set("mysteryBoxTier", e.target.value)} className="input">
                <option value="BRONZE">Bronze</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
              </select>
            </Field>
            <Field label="Locked (mandatory, hidden) items revealed">
              <input type="number" min={0} value={form.mysteryBoxLockedCount ?? 1} onChange={(e) => set("mysteryBoxLockedCount", e.target.value)} className="input" />
            </Field>
            <Field label="Customer choice items (0 = fully random, old behavior)">
              <input type="number" min={0} value={form.mysteryBoxChooseCount ?? 0} onChange={(e) => set("mysteryBoxChooseCount", e.target.value)} className="input" />
            </Field>
            {form.id && (
              <a href={`/admin/products/${form.id}/mystery-box-contents`} className="btn-outline inline-block !py-2 text-sm">
                Manage Possible Products Pool →
              </a>
            )}
          </>
        )}
      </section>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving..." : form.id ? "Update Product" : "Create Product"}
      </button>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/60">{label}</label>
      {children}
    </div>
  );
}
