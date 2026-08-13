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
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 2px 10px -2px rgba(11,12,14,0.08), 0 1px 3px -1px rgba(11,12,14,0.06)",
        "card-hover": "0 12px 28px -8px rgba(11,12,14,0.18)",
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
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
