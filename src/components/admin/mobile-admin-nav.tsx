"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu, X, LogOut,
  LayoutDashboard, Package, ShoppingBag, Tag, Building2, Crown, Users, Activity,
  LifeBuoy, Sparkles, MessageSquare, MessageCircle, Truck, Wallet, BarChart3, Gift, Calculator, Layers,
  Boxes, Zap, Gavel, Megaphone, Image, Plus, Settings, Brain, Globe, TrendingUp,
} from "lucide-react";
import { signOut } from "next-auth/react";

/**
 * Fix (runtime bug) — NAV items used to carry a live icon COMPONENT
 * REFERENCE (e.g. `icon: Users`) from the admin/layout.tsx Server
 * Component straight into this Client Component's props. Passing a
 * component reference across the server->client boundary is fragile
 * in RSC and threw "Functions cannot be passed directly to Client
 * Components" at runtime. Fixed by passing a plain, fully serializable
 * ICON NAME STRING instead, resolved to a real component only here,
 * inside the client boundary, via this lookup map.
 */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Package, ShoppingBag, Tag, Building2, Crown, Users, Activity,
  LifeBuoy, Sparkles, MessageSquare, MessageCircle, Truck, Wallet, BarChart3, Gift, Calculator, Layers,
  Boxes, Zap, Gavel, Megaphone, Image, Plus, Settings, Brain, Globe, TrendingUp,
};

interface NavItem {
  href: string;
  label: string;
  icon: string; // icon name — see ICONS map above
}

export function MobileAdminNav({ items, brand }: { items: NavItem[]; brand: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-black/5 bg-white px-4 py-3 md:hidden">
      <div className="flex items-center justify-between">
        {brand}
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85vw] overflow-y-auto bg-white p-4">
            <div className="mb-6 flex items-center justify-between">
              {brand}
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {items.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-saveo-emerald-700/70 hover:bg-saveo-emerald-50"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </nav>
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
