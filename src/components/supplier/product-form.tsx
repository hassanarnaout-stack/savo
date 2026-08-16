"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { calcDiscountPct, slugify } from "@/lib/utils";
import { validateBarcode } from "@/lib/barcode";
import { validateMediaUrl } from "@/lib/media-url-validation";

interface Category {
  id: string;
  name: string;
}

export interface SupplierProductFormValues {
  id?: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  categoryId: string;
  type: "STANDARD" | "DEAL" | "MYSTERY_BOX" | "RESCUE";
  originalPrice: string;
  purchaseCost: string;
  saveoPrice: string;
  stockQty: string;
  lowStockAlert: string;
  dealEndsAt: string;
  expiryDate: string;
  imageUrl: string;
  mysteryBoxReveal: string;
  barcode: string;
  internalCode: string;
  productStory: string;
  originStory: string;
}

const EMPTY: SupplierProductFormValues = {
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  categoryId: "",
  type: "STANDARD",
  originalPrice: "",
  purchaseCost: "",
  saveoPrice: "",
  stockQty: "0",
  lowStockAlert: "5",
  dealEndsAt: "",
  expiryDate: "",
  imageUrl: "",
  mysteryBoxReveal: "",
  barcode: "",
  internalCode: "",
  productStory: "",
  originStory: "",
};

export function SupplierProductForm({ categories, initial }: { categories: Category[]; initial?: SupplierProductFormValues }) {
  const router = useRouter();
  const [form, setForm] = useState<SupplierProductFormValues>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);

  const discount = calcDiscountPct(Number(form.originalPrice) || 0, Number(form.saveoPrice) || 0);

  function set<K extends keyof SupplierProductFormValues>(key: K, value: SupplierProductFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.imageUrl.trim()) {
      const check = validateMediaUrl(form.imageUrl.trim(), "image");
      if (!check.valid) {
        toast.error(check.error ?? "Invalid image URL");
        return;
      }
    }

    if (form.barcode.trim()) {
      const check = validateBarcode(form.barcode.trim());
      if (!check.valid) {
        toast.error(check.error ?? "Invalid barcode");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(form.id ? `/api/supplier/products/${form.id}` : "/api/supplier/products", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save product");
      }
      toast.success(form.id ? "Product updated" : "Product created");
      router.push("/supplier/products");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Could not save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="font-bold text-saveo-emerald-700">Basic Information</h2>
        <Field label="Product Name">
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="input" />
        </Field>
        <Field label="Product Name (Arabic, optional)">
          <input value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} className="input" dir="rtl" />
        </Field>
        <Field label="Description">
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Description (Arabic, optional)">
          <textarea
            rows={3}
            value={form.descriptionAr}
            onChange={(e) => set("descriptionAr", e.target.value)}
            className="input"
            dir="rtl"
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
        <Field label="Product Type">
          <select value={form.type} onChange={(e) => set("type", e.target.value as any)} className="input">
            <option value="STANDARD">Standard</option>
            <option value="DEAL">Savo Deal (time-limited)</option>
            <option value="MYSTERY_BOX">Mystery Box</option>
            <option value="RESCUE">Savo Rescue Deal (near-expiry)</option>
          </select>
        </Field>
        <Field label="Primary Image URL (paste a link — file upload is not available yet)">
          <input
            value={form.imageUrl}
            onChange={(e) => set("imageUrl", e.target.value)}
            className="input"
            placeholder="https://your-image-host.com/product.jpg"
          />
          <p className="mt-1.5 text-xs text-saveo-muted">
            Best results: 1600×1600px (1200×1200px minimum), square, plain background, no watermark or price overlay.
          </p>
        </Field>
        <Field label="Barcode (optional)">
          <input
            value={form.barcode}
            onChange={(e) => set("barcode", e.target.value)}
            className="input"
            placeholder="EAN-13, UPC-A, Code-128, or your own internal code"
          />
          <BarcodeHint value={form.barcode} />
        </Field>
        <Field label="Internal Code (optional)">
          <input
            value={form.internalCode}
            onChange={(e) => set("internalCode", e.target.value)}
            className="input"
            placeholder="Your own warehouse reference code"
          />
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-bold text-saveo-emerald-700">Product Experience Content</h2>
          <p className="text-xs text-saveo-emerald-700/50">Optional — submitted content is reviewed by Savo before it appears to customers.</p>
        </div>
        <Field label="Product Story">
          <textarea
            value={form.productStory}
            onChange={(e) => set("productStory", e.target.value)}
            className="input"
            rows={3}
            maxLength={2000}
            placeholder="Tell customers what makes this product special..."
          />
        </Field>
        <Field label="Origin / Why We Chose It">
          <textarea
            value={form.originStory}
            onChange={(e) => set("originStory", e.target.value)}
            className="input"
            rows={2}
            maxLength={1000}
            placeholder="Country of origin, sourcing story, etc."
          />
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold text-saveo-emerald-700">Pricing &amp; Stock</h2>
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
          <Field label="Purchase Cost (KD) — private, for your profit tracking only">
            <input
              type="number"
              step="0.001"
              value={form.purchaseCost}
              onChange={(e) => set("purchaseCost", e.target.value)}
              className="input"
              placeholder="What you paid to acquire this item"
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
          Discount: <span className="font-bold text-saveo-emerald-600">{discount}%</span>
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
        <h2 className="font-bold text-saveo-emerald-700">Deal Settings</h2>
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
          <Field label="Mystery Box Reveal Text">
            <textarea
              rows={2}
              value={form.mysteryBoxReveal}
              onChange={(e) => set("mysteryBoxReveal", e.target.value)}
              className="input"
            />
          </Field>
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

const FORMAT_LABELS: Record<string, string> = {
  EAN13: "EAN-13",
  UPC_A: "UPC-A",
  CODE128: "Code-128",
  INTERNAL: "Internal code",
};

function BarcodeHint({ value }: { value: string }) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const result = validateBarcode(trimmed);
  if (result.valid) {
    return <p className="mt-1 text-xs font-medium text-saveo-emerald-600">✓ Recognized as {FORMAT_LABELS[result.format!]}</p>;
  }
  return <p className="mt-1 text-xs font-medium text-red-600">{result.error}</p>;
}
