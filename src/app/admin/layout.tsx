import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import NextImage from "next/image";
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Building2, Crown, Users, Activity,
  LifeBuoy, Sparkles, MessageSquare, MessageCircle, Truck, Wallet, BarChart3, Gift, Calculator, Layers,
  Boxes, Zap, Gavel, Megaphone, Image, Plus, Settings, Brain, Globe, TrendingUp, ClipboardList,
} from "lucide-react";
import "../globals.css";
import { Toaster } from "sonner";
import { MobileAdminNav } from "@/components/admin/mobile-admin-nav";
import { SidebarLogoutButton } from "@/components/admin/sidebar-logout-button";
import { BrowserExtensionErrorGuard } from "@/components/layout/browser-extension-error-guard";

// Fix (runtime bug) — icon is now a serializable NAME STRING, not a
// live component reference. A component reference in this array used
// to get passed straight into the MobileAdminNav Client Component via
// props, which is fragile across the RSC server->client boundary and
// threw "Functions cannot be passed directly to Client Components" at
// runtime. ICON_MAP below resolves the string back to a component for
// the desktop sidebar, which renders within this Server Component and
// never crosses that boundary.
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Package, ShoppingBag, Tag, Building2, Crown, Users, Activity,
  LifeBuoy, Sparkles, MessageSquare, MessageCircle, Truck, Wallet, BarChart3, Gift, Calculator, Layers,
  Boxes, Zap, Gavel, Megaphone, Image, Plus, Settings, Brain, Globe, TrendingUp, ClipboardList,
};

const NAV = [
  { href: "/admin/operations", label: "Operations", icon: "Activity" },
  { href: "/admin/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/admin/accounting", label: "Accounting", icon: "Calculator" },
  { href: "/admin/inventory-reports", label: "Inventory Reports", icon: "Boxes" },
  { href: "/admin/inventory/receiving", label: "Receiving", icon: "Truck" },
  { href: "/admin/inventory/expiry", label: "Expiry", icon: "Activity" },
  { href: "/admin/inventory/damaged", label: "Damaged", icon: "Boxes" },
  { href: "/admin/reports", label: "Reports", icon: "BarChart3" },
  { href: "/admin/marketing/campaigns", label: "Campaigns", icon: "Gift" },
  { href: "/admin/marketing/deal-of-the-hour", label: "Deal of the Hour", icon: "Zap" },
  { href: "/admin/marketing/studio", label: "Marketing Studio", icon: "Sparkles" },
  { href: "/admin/automations", label: "Marketing Automation", icon: "Zap" },
  { href: "/admin/customer-intelligence", label: "Customer Intelligence", icon: "Brain" },
  { href: "/admin/regions", label: "Regional Expansion", icon: "Globe" },
  { href: "/admin/marketing/flash-deals", label: "Flash Deals", icon: "Zap" },
  { href: "/admin/marketing/auctions", label: "Auctions", icon: "Gavel" },
  { href: "/admin/marketing/brand-campaigns", label: "Brand Campaigns", icon: "Megaphone" },
  { href: "/admin/media", label: "Media Manager", icon: "Image" },
  { href: "/admin/discover-quick-ways", label: "Discover — Quick Ways In", icon: "Compass" },
  { href: "/admin/homepage-settings", label: "Homepage Settings", icon: "Home" },
  { href: "/admin/login-showcase", label: "Login Showcase Products", icon: "Image" },
  { href: "/admin/catalog-brands", label: "Catalog Brands", icon: "Tag" },
  { href: "/admin/beta-center", label: "Beta Center", icon: "Sparkles" },
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/business-dashboard", label: "Business Dashboard", icon: "BarChart3" },
  { href: "/admin/business-intelligence", label: "Business Intelligence", icon: "TrendingUp" },
  { href: "/admin/enterprise-analytics", label: "Enterprise Analytics", icon: "BarChart3" },
  { href: "/admin/ai-assistant", label: "AI Assistant", icon: "Sparkles" },
  { href: "/admin/pricing-intelligence", label: "Pricing Intelligence", icon: "Calculator" },
  { href: "/admin/warehouse", label: "Warehouse", icon: "Boxes" },
  { href: "/admin/warehouse/purchase-orders", label: "Purchase Orders", icon: "ClipboardList" },
  { href: "/admin/products", label: "Products", icon: "Package" },
  { href: "/admin/products/new", label: "Add Product", icon: "Plus" },
  { href: "/admin/products/pending", label: "Pending Approvals", icon: "Package" },
  { href: "/admin/products/experience", label: "Product Experience", icon: "Sparkles" },
  { href: "/admin/orders", label: "Orders", icon: "ShoppingBag" },
  { href: "/admin/delivery", label: "Delivery", icon: "Truck" },
  { href: "/admin/finance", label: "Finance", icon: "Wallet" },
  { href: "/admin/support", label: "Support", icon: "LifeBuoy" },
  { href: "/admin/feedback", label: "Feedback", icon: "MessageSquare" },
  { href: "/admin/suppliers", label: "Suppliers", icon: "Building2" },
  { href: "/admin/supplier-performance", label: "Supplier Performance", icon: "TrendingUp" },
  { href: "/admin/reviews", label: "Review Moderation", icon: "MessageSquare" },
  { href: "/admin/messages", label: "Messages", icon: "MessageCircle" },
  { href: "/admin/affiliates", label: "Affiliate Program", icon: "Users" },
  { href: "/admin/collections", label: "Collections", icon: "Layers" },
  { href: "/admin/supplier-payouts", label: "Supplier Payouts", icon: "Wallet" },
  { href: "/admin/return-requests", label: "Return Requests", icon: "LifeBuoy" },
  { href: "/admin/brands", label: "Brands", icon: "Megaphone" },
  { href: "/admin/brand-packages", label: "Brand Packages", icon: "Crown" },
  { href: "/admin/categories", label: "Categories", icon: "Tag" },
  { href: "/admin/membership/plans", label: "Membership Plans", icon: "Crown" },
  { href: "/admin/membership/members", label: "Members", icon: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <html lang="en" dir="ltr">
      <body>
        <Toaster position="top-center" richColors />
        <BrowserExtensionErrorGuard />
        <MobileAdminNav
          items={NAV}
          brand={
            <Link href="/admin" className="flex items-center gap-1.5 text-lg font-black">
              <NextImage src="/brand/savo-logo-dark.png" alt="Savo" width={78} height={27} className="h-6 w-auto" />
              <span className="text-xs font-semibold text-saveo-emerald-700/40">Admin</span>
            </Link>
          }
        />
        <div className="flex min-h-screen bg-saveo-cream">
          <aside className="hidden w-60 shrink-0 flex-col border-r border-black/5 bg-white px-4 py-6 md:flex">
            <Link href="/admin" className="mb-8 flex items-center gap-1.5 px-2 text-xl font-black">
              <NextImage src="/brand/savo-logo-dark.png" alt="Savo" width={91} height={31} className="h-7 w-auto" />
              <span className="text-xs font-semibold text-saveo-emerald-700/40">Admin</span>
            </Link>
            <nav className="flex flex-col gap-1 overflow-y-auto">
              {NAV.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-saveo-emerald-700/70 hover:bg-saveo-emerald-50 hover:text-saveo-emerald-800"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto space-y-1 border-t border-black/5 pt-3">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-saveo-emerald-700/50"
              >
                <Settings className="h-4 w-4" /> Back to store
              </Link>
              <SidebarLogoutButton />
            </div>
          </aside>
          <div className="flex-1 overflow-x-hidden">{children}</div>
        </div>
      </body>
    </html>
  );
}
