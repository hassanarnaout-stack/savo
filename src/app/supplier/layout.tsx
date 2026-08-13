import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Package, Boxes, ClipboardList, BarChart3, Receipt, Plus, TrendingUp, MessageCircle } from "lucide-react";
import { Toaster } from "sonner";
import { BrowserExtensionErrorGuard } from "@/components/layout/browser-extension-error-guard";
import "../globals.css";
import { SidebarLogoutButton } from "@/components/admin/sidebar-logout-button";

const NAV = [
  { href: "/supplier", label: "Dashboard", icon: LayoutDashboard },
  { href: "/supplier/products", label: "Products", icon: Package },
  { href: "/supplier/products/new", label: "Add Product", icon: Plus },
  { href: "/supplier/inventory", label: "Inventory", icon: Boxes },
  { href: "/supplier/orders", label: "Orders", icon: ClipboardList },
  { href: "/supplier/reports", label: "Reports", icon: BarChart3 },
  { href: "/supplier/intelligence", label: "Growth Intelligence", icon: TrendingUp },
  { href: "/supplier/messages", label: "Messages", icon: MessageCircle },
  { href: "/supplier/settlements", label: "Settlements", icon: Receipt },
];

export default function SupplierAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <Toaster position="top-center" richColors />
        <BrowserExtensionErrorGuard />
        <div className="min-h-screen bg-saveo-cream">
          <header className="flex items-center gap-4 border-b border-black/5 bg-white px-4 py-3 sm:gap-6 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 text-xl font-black text-saveo-emerald-700">
              <Image src="/brand/savo-logo-dark.png" alt="Savo" width={91} height={31} className="h-7 w-auto" />
              <span className="hidden text-xs font-semibold text-saveo-emerald-700/40 sm:inline">Supplier</span>
            </Link>
            <nav className="flex flex-1 gap-1 overflow-x-auto">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-saveo-emerald-700/70 hover:bg-saveo-emerald-50 hover:text-saveo-emerald-800"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="shrink-0">
              <SidebarLogoutButton />
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
