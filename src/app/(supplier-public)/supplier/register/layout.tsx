import { Toaster } from "sonner";
import { BrowserExtensionErrorGuard } from "@/components/layout/browser-extension-error-guard";
import "@/app/globals.css";

/**
 * Root layout for the PUBLIC supplier registration flow ONLY
 * (/supplier/register, /supplier/register/profile).
 *
 * WHY THIS EXISTS: src/app/supplier/layout.tsx defines its own
 * <html>/<body> and unconditionally renders the authenticated
 * Supplier Portal navigation + Logout button for EVERY route beneath
 * it — with zero session check. Any layout nested inside that folder
 * would still inherit that header (Next.js layouts nest, they don't
 * replace an ancestor's <html>/<body>). The only real fix is moving
 * these two pages to a separate root outside src/app/supplier/* via
 * a Next.js Route Group — (supplier-public) doesn't appear in the
 * URL, so the public path stays exactly /supplier/register.
 *
 * This layout intentionally has NO supplier dashboard nav and NO
 * session/auth requirement — it's the correct shell for a page a
 * signed-out visitor is meant to see.
 */
export default function SupplierPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <Toaster position="top-center" richColors />
        <BrowserExtensionErrorGuard />
        {children}
      </body>
    </html>
  );
}
