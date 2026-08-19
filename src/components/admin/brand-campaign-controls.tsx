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
  const [headline, setHeadline] = useState("");
  const [headlineAr, setHeadlineAr] = useState("");
  const [label, setLabel] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaTextAr, setCtaTextAr] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [showPrice, setShowPrice] = useState(false);
  const [showStockUrgency, setShowStockUrgency] = useState(false);
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
          headline: headline || undefined,
          headlineAr: headlineAr || undefined,
          label: label || undefined,
          labelAr: labelAr || undefined,
          ctaText: ctaText || undefined,
          ctaTextAr: ctaTextAr || undefined,
          sortOrder: sortOrder ? parseInt(sortOrder, 10) : undefined,
          showPrice,
          showStockUrgency,
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

      {(type === "SPONSORED_PRODUCT" || type === "SEARCH_BOOST" || type === "HOMEPAGE_BANNER") && (
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
          <option value="">{type === "HOMEPAGE_BANNER" ? "Link a real product (optional — needed for price/stock)..." : "Select product..."}</option>
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
          <input value={bannerLinkUrl} onChange={(e) => setBannerLinkUrl(e.target.value)} placeholder="Link URL (or leave blank to use a linked product's page)" className="input text-sm" />
          <p className="text-xs font-semibold text-saveo-emerald-700/50">SAVO Discovery slide content (optional)</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline (EN)" className="input text-sm" />
            <input value={headlineAr} onChange={(e) => setHeadlineAr(e.target.value)} dir="rtl" placeholder="Headline (AR)" className="input text-sm" />
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (EN) e.g. EDITOR'S PICK" className="input text-sm" />
            <input value={labelAr} onChange={(e) => setLabelAr(e.target.value)} dir="rtl" placeholder="Label (AR)" className="input text-sm" />
            <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="CTA text (EN) e.g. Discover" className="input text-sm" />
            <input value={ctaTextAr} onChange={(e) => setCtaTextAr(e.target.value)} dir="rtl" placeholder="CTA text (AR)" className="input text-sm" />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-saveo-emerald-700/50">Sort order</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="input w-20 text-sm" />
            </div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-saveo-emerald-700/70">
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
              Show real product price
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-saveo-emerald-700/70">
              <input type="checkbox" checked={showStockUrgency} onChange={(e) => setShowStockUrgency(e.target.checked)} />
              Show real stock urgency
            </label>
          </div>
          {(showPrice || showStockUrgency) && (
            <p className="text-xs text-amber-600">Price/stock will use the linked product above — select one in the Product dropdown if this campaign should show real numbers.</p>
          )}
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
