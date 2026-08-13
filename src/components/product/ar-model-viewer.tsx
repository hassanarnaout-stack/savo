"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * AR-Ready Architecture (Phase 8.0 batch 3)
 *
 * Uses Google's real <model-viewer> web component (loaded lazily from
 * CDN, only when a product actually has a THREE_D_MODEL asset) — not a
 * custom-built 3D/AR renderer. AR activation is model-viewer's own
 * real, native capability on supported devices (ARCore on Android,
 * Quick Look on iOS with a .usdz variant) — this doesn't simulate or
 * fake AR, it wires up genuine assets to genuine, existing OS AR
 * pipelines.
 *
 * SCOPE NOTE: no supplier has uploaded a real .glb/.usdz model yet —
 * this is the display architecture, ready the moment one is uploaded
 * via ProductMedia (type: THREE_D_MODEL).
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        "ios-src"?: string;
        alt?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "shadow-intensity"?: string;
      };
    }
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadModelViewerScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (customElements.get("model-viewer")) return resolve();
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load 3D viewer"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export function ARModelViewer({ modelUrl, iosModelUrl, productName }: { modelUrl: string; iosModelUrl?: string; productName: string }) {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModelViewerScript().then(() => setReady(true)).catch(() => setReady(false));
  }, []);

  if (!modelUrl) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl2 bg-black/5">
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-white px-3 py-2 text-xs font-semibold text-saveo-emerald-700">
        <Sparkles className="h-3.5 w-3.5" /> 3D / AR View
      </div>
      <div ref={containerRef} className="aspect-square w-full">
        {ready ? (
          // @ts-ignore — model-viewer is a real custom element, not a React component
          <model-viewer
            src={modelUrl}
            ios-src={iosModelUrl}
            alt={productName}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-saveo-emerald-700/40">Loading 3D viewer...</div>
        )}
      </div>
    </div>
  );
}
