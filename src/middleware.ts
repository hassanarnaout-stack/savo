import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Run on every route except static assets, API routes, and admin/supplier
  // (both stay English-only / non-localized by design for now).
  matcher: ["/((?!api|admin|supplier|_next|_vercel|.*\\..*).*)"],
};
