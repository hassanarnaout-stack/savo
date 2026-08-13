"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Copy } from "lucide-react";

export function AdContentGeneratorForm({ products, categories }: { products: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const [subjectType, setSubjectType] = useState<"product" | "category">("product");
  const [subjectId, setSubjectId] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("playful");
  const [goal, setGoal] = useState("SALES");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId) return toast.error("Select a product or category");
    const list = subjectType === "product" ? products : categories;
    const subject = list.find((x) => x.id === subjectId)?.name ?? "";

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/marketing/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [subjectType === "product" ? "productId" : "categoryId"]: subjectId,
          subject,
          targetAudience,
          platform,
          tone,
          goal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate content");
      setResult(data.adContent);
      toast.success("Ad copy generated and saved");
    } catch (err: any) {
      toast.error(err.message ?? "Could not generate content");
    } finally {
      setGenerating(false);
    }
  }

  function copyAll() {
    if (!result) return;
    const text = `${result.headline}\n\n${result.longDescription}\n\n${result.cta}\n\n${result.hashtags.join(" ")}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleGenerate} className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-bold text-saveo-emerald-700">
          <Sparkles className="h-4 w-4" /> Ad Content Generator
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <select value={subjectType} onChange={(e) => { setSubjectType(e.target.value as any); setSubjectId(""); }} className="input text-sm">
            <option value="product">Product</option>
            <option value="category">Category</option>
          </select>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input text-sm">
            <option value="">Select...</option>
            {(subjectType === "product" ? products : categories).map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </div>
        <input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Target audience (e.g. young professionals in Kuwait)" className="input text-sm" />
        <div className="grid grid-cols-3 gap-2">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input text-sm">
            <option>Instagram</option>
            <option>TikTok</option>
            <option>Snapchat</option>
            <option>Facebook</option>
          </select>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="input text-sm">
            <option value="playful">Playful</option>
            <option value="urgent">Urgent</option>
            <option value="premium">Premium</option>
            <option value="friendly">Friendly</option>
          </select>
          <select value={goal} onChange={(e) => setGoal(e.target.value)} className="input text-sm">
            <option value="SALES">Sales</option>
            <option value="TRAFFIC">Traffic</option>
            <option value="CUSTOMERS">Customers</option>
            <option value="RETENTION">Retention</option>
            <option value="AWARENESS">Awareness</option>
          </select>
        </div>
        <button type="submit" disabled={generating} className="btn-primary w-full text-sm">
          {generating ? "Generating..." : "Generate Ad Copy"}
        </button>
      </form>

      <div className="card p-5">
        <h2 className="mb-3 font-bold text-saveo-emerald-700">Preview</h2>
        {result ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-saveo-emerald-700/50">Headline</p>
              <p className="text-lg font-bold">{result.headline}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-saveo-emerald-700/50">Short Description</p>
              <p>{result.shortDescription}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-saveo-emerald-700/50">Long Description</p>
              <p>{result.longDescription}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-saveo-emerald-700/50">Call To Action</p>
              <p className="font-bold text-saveo-gold-600">{result.cta}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-saveo-emerald-700/50">Hashtags</p>
              <p className="text-saveo-emerald-600">{result.hashtags.join(" ")}</p>
            </div>
            <button onClick={copyAll} className="btn-outline flex items-center gap-1.5 text-xs">
              <Copy className="h-3.5 w-3.5" /> Copy All
            </button>
          </div>
        ) : (
          <p className="text-sm text-saveo-emerald-700/40">Generate ad copy to see the preview here.</p>
        )}
      </div>
    </div>
  );
}
