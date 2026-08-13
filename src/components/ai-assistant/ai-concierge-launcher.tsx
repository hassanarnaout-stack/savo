"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { AIConciergePanel } from "./ai-concierge-panel";

/**
 * AI CONCIERGE LAUNCHER
 * ============================================================
 * The real, single floating entry point for Saveo's AI Shopping
 * Assistant — replaces the legacy ShoppingAssistantWidget's
 * floating button (which hid entirely for anonymous visitors).
 * This launcher is shown to everyone: AIConciergePanel already
 * degrades correctly for anonymous sessions (product/brand/
 * category/promotion context only, per Phase 4's real isolation),
 * so there's no reason to hide the entry point itself.
 * ============================================================
 */
export function AIConciergeLauncher({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 end-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-saveo-emerald-700 text-white shadow-lg transition-transform hover:scale-105"
        aria-label="Saveo AI Concierge"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6 text-saveo-gold-400" />}
      </button>

      {open && <AIConciergePanel locale={locale} onClose={() => setOpen(false)} />}
    </>
  );
}
