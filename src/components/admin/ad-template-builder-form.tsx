"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
  imageUrl: string | null;
  saveoPrice: number;
  discountPct: number;
}

export function AdTemplateBuilderForm({ products }: { products: ProductOption[] }) {
  const [templateType, setTemplateType] = useState("FLASH_DEAL");
  const [productId, setProductId] = useState("");
  const [ctaText, setCtaText] = useState("Shop Now");
  const [timerText, setTimerText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);

  const product = products.find((p) => p.id === productId);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return toast.error("Select a product");
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/marketing/studio/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType,
          productId,
          config: {
            productName: product.name,
            imageUrl: product.imageUrl ?? "/placeholder-product.png",
            price: `${product.saveoPrice.toFixed(3)} KD`,
            discountPercent: product.discountPct || undefined,
            timerText: timerText || undefined,
            ctaText,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate ad");
      setSvg(data.ad.svgContent);
      toast.success("Ad image generated");
    } catch (err: any) {
      toast.error(err.message ?? "Could not generate ad");
    } finally {
      setGenerating(false);
    }
  }

  function download() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saveo-ad-${templateType.toLowerCase()}-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleGenerate} className="card space-y-3 p-5">
        <h2 className="font-bold text-saveo-emerald-700">🎨 Ad Template Builder</h2>
        <select value={templateType} onChange={(e) => setTemplateType(e.target.value)} className="input text-sm">
          <option value="PRODUCT_CARD">Product Card</option>
          <option value="FLASH_DEAL">Flash Deal</option>
          <option value="MYSTERY_BOX">Mystery Box</option>
          <option value="NEW_ARRIVAL">New Arrival</option>
          <option value="DISCOUNT">Discount</option>
          <option value="SAVEO_PLUS">Savo Plus</option>
        </select>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input text-sm">
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="CTA text" className="input text-sm" />
        <input value={timerText} onChange={(e) => setTimerText(e.target.value)} placeholder="Timer text (optional, e.g. Ends in 2 hours)" className="input text-sm" />
        <button type="submit" disabled={generating} className="btn-primary w-full text-sm">
          {generating ? "Generating..." : "Generate Ad Image"}
        </button>
      </form>

      <div className="card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Preview</h2>
        {svg ? (
          <div>
            <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl2 border border-black/5" dangerouslySetInnerHTML={{ __html: svg }} />
            <button onClick={download} className="btn-outline mt-3 flex w-full items-center justify-center gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Download SVG
            </button>
          </div>
        ) : (
          <p className="text-sm text-saveo-emerald-700/40">Generate an ad to see the preview here.</p>
        )}
      </div>
    </div>
  );
}
