import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LayoutDashboard, Megaphone, Zap } from "lucide-react";
import { Toaster } from "sonner";
import { BrowserExtensionErrorGuard } from "@/components/layout/browser-extension-error-guard";
import "../globals.css";
import { SidebarLogoutButton } from "@/components/admin/sidebar-logout-button";
import { getBrandAccountGate } from "@/lib/auth";

const NAV = [
  { href: "/brand", label: "Dashboard", icon: LayoutDashboard },
  { href: "/brand/sponsored-slots", label: "Sponsored Products", icon: Zap },
  { href: "/brand/campaigns/create", label: "New Campaign", icon: Megaphone },
];

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  // Real auth check at the layout level — defense in depth. Each page
  // under /brand/ already re-checks this individually (getBrandAccountGate),
  // but that meant a new page here could ship unprotected if a developer
  // forgot to add the check. This layout-level gate makes that impossible.
  const gate = await getBrandAccountGate();
  if (!gate.ok) redirect("/login?callbackUrl=/brand");

  return (
    <html lang="en" dir="ltr">
      <body>
        <Toaster position="top-center" richColors />
        <BrowserExtensionErrorGuard />
        <div className="min-h-screen bg-saveo-cream">
          <header className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-4">
            <Link href="/brand" className="flex items-center gap-1.5 text-lg font-black">
              <Image src="/brand/savo-logo-dark.png" alt="Savo" width={78} height={27} className="h-6 w-auto" />
              <span className="text-xs font-semibold text-saveo-emerald-700/40">Brand Center</span>
            </Link>
            <nav className="flex items-center gap-4">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-1.5 text-sm font-medium text-saveo-emerald-700/70 hover:text-saveo-emerald-800">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <SidebarLogoutButton />
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
