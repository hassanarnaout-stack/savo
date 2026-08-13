import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "always", // /en/products, /ar/products — explicit, no hidden default
});

// Locale-aware Link, redirect, usePathname, useRouter — use these instead of
// the next/navigation equivalents anywhere in the app so links stay correct
// when the user switches language.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
