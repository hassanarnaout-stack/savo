"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateBrandCampaignForm({
  products,
  categories,
}: {
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [type, setType] = useState("SPONSORED_PRODUCT");
  const [productId, setProductId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [bannerLinkUrl, setBannerLinkUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName || !startDate || !endDate || !budget) return toast.error("Fill in all fields");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/brand-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          type,
          productId: productId || undefined,
          categoryId: categoryId || undefined,
          bannerImageUrl: bannerImageUrl || undefined,
          bannerLinkUrl: bannerLinkUrl || undefined,
          startDate,
          endDate,
          budget: parseFloat(budget),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Brand campaign created");
      router.refresh();
    } catch {
      toast.error("Could not create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-saveo-emerald-700">Create Brand Campaign</h2>
      <div className="grid grid-cols-2 gap-2">
        <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand name" className="input text-sm" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="input text-sm">
          <option value="SPONSORED_PRODUCT">Sponsored Product</option>
          <option value="HOMEPAGE_BANNER">Homepage Banner</option>
          <option value="CATEGORY_HIGHLIGHT">Category Highlight</option>
          <option value="SEARCH_BOOST">Search Boost</option>
        </select>
      </div>

      {(type === "SPONSORED_PRODUCT" || type === "SEARCH_BOOST") && (
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}
      {type === "CATEGORY_HIGHLIGHT" && (
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input text-sm">
          <option value="">Select category...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      {type === "HOMEPAGE_BANNER" && (
        <>
          <input value={bannerImageUrl} onChange={(e) => setBannerImageUrl(e.target.value)} placeholder="Banner image URL" className="input text-sm" />
          <input value={bannerLinkUrl} onChange={(e) => setBannerLinkUrl(e.target.value)} placeholder="Link URL" className="input text-sm" />
        </>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Budget (KD)</label>
          <input type="number" step="0.001" value={budget} onChange={(e) => setBudget(e.target.value)} className="input text-sm" />
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full text-sm">Create Campaign</button>
    </form>
  );
}

export function BrandCampaignToggle({ campaignId, isActive }: { campaignId: string; isActive: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/brand-campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not update campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${isActive ? "bg-saveo-emerald-700 text-white" : "bg-black/5 text-saveo-emerald-700/70"}`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
