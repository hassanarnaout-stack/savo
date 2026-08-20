import { Sparkles } from "lucide-react";

export function PlusBadge({ size = "sm", variant = "solid" }: { size?: "xs" | "sm" | "md"; variant?: "solid" | "dark" }) {
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[9px] gap-0.5",
    sm: "px-2 py-1 text-[10px] gap-1",
    md: "px-2.5 py-1.5 text-xs gap-1",
  }[size];
  const iconSize = { xs: "h-2.5 w-2.5", sm: "h-3 w-3", md: "h-3.5 w-3.5" }[size];

  // "dark" — Phase 2.1 PLUS visual correction: for the SAVO Ink/Surface
  // header where a solid gold fill would compete with the Discovery
  // teal CTA. Restrained premium accent: dark surface, Gold text/icon/
  // border only — no solid gold fill. Every other call site (light
  // backgrounds: account, orders, checkout, membership dashboard) is
  // completely untouched — they don't pass `variant`, so they keep the
  // exact same solid-gold treatment as before this change.
  //
  // Icon: Sparkles (✦), matching the ONE unified SAVO Plus identity
  // used everywhere else (membership card, homepage Plus section,
  // login) — Crown was the old pre-unification identity and is
  // retired here too, so every PlusBadge in the app (header, account,
  // orders, checkout, membership dashboard) now shares the same mark.
  if (variant === "dark") {
    return (
      <span
        className={`inline-flex items-center rounded-full border font-bold ${sizeClasses}`}
        style={{ background: "var(--savo-shell-surface)", borderColor: "var(--savo-shell-gold)", color: "var(--savo-shell-gold)" }}
      >
        <Sparkles className={iconSize} /> PLUS
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full bg-saveo-gold-400 font-bold text-saveo-emerald-900 ${sizeClasses}`}>
      <Sparkles className={iconSize} /> PLUS
    </span>
  );
}
