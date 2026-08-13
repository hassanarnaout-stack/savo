"use client";

import { toast } from "sonner";
import { Download, Copy, Share2 } from "lucide-react";

type AdContent = {
  headline: string;
  shortDescription: string;
  cta: string;
  hashtags: string[];
} | null;

export function SocialExportPanel({
  campaignName,
  adContent,
  generatedAdSvg,
}: {
  campaignName: string;
  adContent: AdContent;
  generatedAdSvg: string | null;
}) {
  const caption = adContent
    ? `${adContent.headline}\n\n${adContent.shortDescription}\n\n${adContent.cta}\n\n${adContent.hashtags.join(" ")}`
    : `${campaignName}\n\nCheck it out on Savo!`;

  function copyCaption() {
    navigator.clipboard.writeText(caption);
    toast.success("Caption + hashtags copied — ready to paste");
  }

  function downloadImage() {
    if (!generatedAdSvg) return toast.error("No ad image generated yet for this campaign");
    const blob = new Blob([generatedAdSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saveo-export-${campaignName.toLowerCase().replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-xl2 border border-black/5 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-saveo-emerald-700">
        <Share2 className="h-4 w-4" /> Social Media Export
      </h2>
      <p className="mb-3 text-xs text-saveo-emerald-700/50">Ready for Instagram, TikTok, Snapchat, and Facebook.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {generatedAdSvg && (
          <div className="aspect-square max-w-xs overflow-hidden rounded-xl2 border border-black/5" dangerouslySetInnerHTML={{ __html: generatedAdSvg }} />
        )}
        <div>
          <p className="mb-1 text-xs font-semibold text-saveo-emerald-700/50">Caption + Hashtags</p>
          <pre className="whitespace-pre-wrap rounded-lg bg-black/[0.03] p-3 text-xs">{caption}</pre>
          <div className="mt-3 flex gap-2">
            <button onClick={copyCaption} className="btn-outline flex items-center gap-1.5 text-xs">
              <Copy className="h-3.5 w-3.5" /> Copy Caption
            </button>
            <button onClick={downloadImage} className="btn-outline flex items-center gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Download Image
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
