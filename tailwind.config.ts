import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Saveo brand identity — Premium Marketplace
        // PRIMARY: Emerald Green (#0B3D2E) — trust, savings, discovery
        // ACCENT:  Gold (#D4AF37) — premium, not a discount-store yellow
        // TEXT:    White on dark surfaces
        // Navy is demoted to an internal secondary scale only — not the
        // brand identity — use sparingly (e.g. an admin-only accent).
        saveo: {
          emerald: {
            50: "#eaf3ef",
            100: "#c7e0d5",
            200: "#96c4ac",
            300: "#5fa082",
            400: "#347a5f",
            500: "#165c43", // mid emerald — hover states, secondary surfaces
            600: "#104a36",
            700: "#0B3D2E", // PRIMARY — hero, header, footer, primary surfaces
            800: "#082e23",
            900: "#051f17",
          },
          gold: {
            50: "#fdf8ec",
            100: "#f8ecc7",
            200: "#f0d788",
            300: "#e2c15c",
            400: "#D4AF37", // ACCENT — badges, CTAs, highlights
            500: "#b8952c",
            600: "#977823",
            700: "#755d1b",
          },
          cream: "#FAFAF8",
          // Secondary/internal-only scale (not the brand identity) —
          // reach for this only where a design explicitly calls for a
          // cooler neutral accent distinct from emerald, e.g. internal
          // admin tooling. Never use as the primary brand color.
          navy: {
            500: "#0F2A4A",
            700: "#0A1A2E",
          },
          // ---------------------------------------------------------------
          // NEW — Figma Make Design Token System (semantic names, per the
          // migration brief). This is the visual source of truth for
          // Homepage-linked components going forward. Values are ported
          // 1:1 from Figma Make's `B` color object where there's no brand
          // clash; kept fully additive — nothing above this line changed,
          // so any page not yet migrated (cart/checkout/PDP/admin/...)
          // keeps working exactly as before.
          // ---------------------------------------------------------------
          ink: {
            DEFAULT: "#0D0E12", // primary dark surface (header, footer, hero, dramatic panels)
            mid: "#1A1C24",     // fields/inputs on ink (search bar, mid-tone cards)
            low: "#252834",     // subtlest dark tier
          },
          primary: {
            DEFAULT: "#00C9A7", // teal — links, prices, primary emphasis, active states
            deep: "#009B80",    // hover/pressed
            glow: "rgba(0,201,167,0.18)",
            pale: "#E3FAF5",
          },
          accent: {
            DEFAULT: "#FF4D2E", // fire — urgency: sale price CTA, low-stock, flash badges
            soft: "#FF6B4E",
            pale: "#FFF1EE",
          },
          surface: "#F5F5F2",
          card: "#FFFFFF",
          muted: "#8A8FA0",
          subtle: "#B5BAC8",
          border: "#E8E8EA",
          success: "#22C55E",
          warn: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
        // New — Figma Make's typographic system. Additive only: existing
        // `sans` (Inter) / `arabic` (IBM Plex Sans Arabic) stay the default
        // everywhere except the Homepage-linked components rebuilt in this
        // phase, which opt into these explicitly.
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        manrope: ["var(--font-manrope)", "var(--font-sans)", "system-ui", "sans-serif"],
        cairo: ["var(--font-cairo)", "var(--font-arabic)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
        // New — matches Figma Make's DealCard radius (16px) precisely.
        card: "1rem",
      },
      boxShadow: {
        card: "0 2px 10px -2px rgba(11,12,14,0.08), 0 1px 3px -1px rgba(11,12,14,0.06)",
        "card-hover": "0 12px 28px -8px rgba(11,12,14,0.18)",
        // New — ported directly from Figma Make's DealCard whileHover shadow.
        "figma-card": "0 16px 40px rgba(0,0,0,0.10)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(15,169,104,0.35)" },
          "100%": { boxShadow: "0 0 0 10px rgba(15,169,104,0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // New — ported from Figma Make's `savoReveal`/`savoDot`/`savoTicker`.
        "figma-reveal": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "figma-dot": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(0.72)", opacity: "0.55" },
        },
        "figma-ticker": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-up": "fade-up 0.4s ease-out both",
        "figma-reveal": "figma-reveal 0.5s ease-out both",
        "figma-dot": "figma-dot 2s ease-in-out infinite",
        "figma-ticker": "figma-ticker 24s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
