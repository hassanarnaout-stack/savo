"use client";

import { ChevronDown, Compass, Flame, Home, ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/cart-store";

const copy = {
  en: {
    discover: "Discover",
    deals: "Deals",
    categories: "Categories",
    brands: "Brands",
    mysteryBoxes: "Mystery Boxes",
    home: "Home",
    cart: "Cart",
    account: "Account",
  },
  ar: {
    discover: "اكتشف",
    deals: "العروض",
    categories: "الفئات",
    brands: "العلامات",
    mysteryBoxes: "صناديق المفاجآت",
    home: "الرئيسية",
    cart: "السلة",
    account: "حسابي",
  },
} as const;

export function DesktopNavigation({ locale }: { locale: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = copy[locale === "ar" ? "ar" : "en"];
  const isDealView = pathname === "/products" && Boolean(searchParams.get("type") || searchParams.get("badge") || searchParams.get("sort") === "discount");
  const dealLinks = [
    { icon: "⚡", en: "Flash Deals", ar: "عروض فلاش", href: "/products?type=DEAL" as const },
    { icon: "✅", en: "Best Deals", ar: "أفضل العروض", href: "/products?sort=discount" as const },
    { icon: "⏰", en: "Ending Soon", ar: "تنتهي قريبًا", href: "/products?badge=LIMITED" as const },
    { icon: "🔥", en: "Limited Quantity", ar: "كميات محدودة", href: "/products?badge=LIMITED" as const },
  ];

  return (
    <nav className="savo-desktop-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Primary navigation"}>
      <div>
        <Link href="/discover" className={pathname === "/discover" ? "active" : ""}>{t.discover}</Link>
        <div className="savo-deals-nav">
          <Link href="/products?type=DEAL" className={isDealView ? "active" : ""}>{t.deals}<ChevronDown aria-hidden="true" /></Link>
          <div className="savo-deals-menu">
            {dealLinks.map((item) => <Link href={item.href} key={item.en}><span>{item.icon}</span><span><strong>{locale === "ar" ? item.ar : item.en}</strong><small lang="ar" dir="rtl">{item.ar}</small></span></Link>)}
            <hr />
            <Link href="/products?type=DEAL" className="savo-all-deals">{locale === "ar" ? "كل العروض ←" : "All Deals →"}</Link>
          </div>
        </div>
        <Link href="/products" className={(pathname === "/products" && !isDealView) || pathname.startsWith("/category/") ? "active" : ""}>{t.categories}</Link>
        <Link href="/brands" className={pathname === "/brands" || pathname.startsWith("/brands/") ? "active" : ""}>{t.brands}</Link>
        <Link href="/mystery-boxes" className={pathname === "/mystery-boxes" || pathname.startsWith("/mystery-boxes/") ? "active" : ""}>{t.mysteryBoxes}</Link>
      </div>
    </nav>
  );
}

export function MobileBottomNavigation({ locale }: { locale: string }) {
  const pathname = usePathname();
  const itemCount = useCartStore((state) => state.itemCount());
  const [mounted, setMounted] = useState(false);
  const t = copy[locale === "ar" ? "ar" : "en"];

  useEffect(() => setMounted(true), []);

  const links = [
    { label: t.home, href: "/" as const, Icon: Home, active: pathname === "/" },
    { label: t.discover, href: "/discover" as const, Icon: Compass, active: pathname === "/discover" },
    { label: t.deals, href: "/products?type=DEAL" as const, Icon: Flame, active: pathname === "/products" },
    { label: t.cart, href: "/cart" as const, Icon: ShoppingCart, active: pathname === "/cart", badge: mounted ? itemCount : 0 },
    { label: t.account, href: "/account" as const, Icon: User, active: pathname === "/account" || pathname.startsWith("/account/") },
  ];

  return (
    <nav className="savo-mobile-bottom-nav" aria-label={locale === "ar" ? "التنقل المحمول" : "Mobile navigation"}>
      {links.map(({ label, href, Icon, active, badge }) => (
        <Link key={label} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
          <span className="savo-bottom-nav-icon"><Icon aria-hidden="true" />{badge ? <b>{badge}</b> : null}</span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
