"use client";

import { Clock, Compass, Flame, Gift, Heart, Menu, Package, Search, Tag, User, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { SavoLogo } from "@/components/layout/savo-logo";

interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  icon: string | null;
}

export function MobileNav({ categories, locale }: { categories: Category[]; locale: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const isArabic = locale === "ar";

  useEffect(() => {
    if (!open) return;

    const scrollRegion = document.querySelector<HTMLElement>(".store-scroll");
    const previousBodyOverflow = document.body.style.overflow;
    const previousRegionOverflow = scrollRegion?.style.overflow;
    document.body.style.overflow = "hidden";
    if (scrollRegion) scrollRegion.style.overflow = "hidden";

    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (scrollRegion) scrollRegion.style.overflow = previousRegionOverflow ?? "";
      triggerRef.current?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);
  const primaryLinks = [
    { label: isArabic ? "اكتشف" : "Discover", href: "/discover" as const, Icon: Compass },
    { label: isArabic ? "عروض فلاش" : "Flash Deals", href: "/products?type=DEAL" as const, Icon: Zap },
    { label: isArabic ? "أفضل العروض" : "Best Deals", href: "/products?sort=discount" as const, Icon: Tag },
    { label: isArabic ? "تنتهي قريبًا" : "Ending Soon", href: "/products?badge=LIMITED" as const, Icon: Clock },
    { label: isArabic ? "كميات محدودة" : "Limited Quantity", href: "/products?badge=LIMITED" as const, Icon: Flame },
    { label: isArabic ? "كل المنتجات" : "All Products", href: "/products" as const, Icon: Search },
    { label: isArabic ? "العلامات" : "Brands", href: "/brands" as const, Icon: Package },
    { label: isArabic ? "صناديق المفاجآت" : "Mystery Boxes", href: "/mystery-boxes" as const, Icon: Gift },
  ];

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)} className="savo-menu-button" aria-label={isArabic ? "فتح القائمة" : "Open menu"} aria-expanded={open}>
        <Menu />
      </button>
      {open && (
        <div className="savo-mobile-drawer-scrim" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <aside ref={drawerRef} className="savo-mobile-drawer" aria-label={isArabic ? "التنقل المحمول" : "Mobile navigation"}>
            <div className="savo-mobile-drawer-head">
              <Link href="/" onClick={close} aria-label="SAVO home"><SavoLogo height={28} tagline /></Link>
              <button onClick={close} aria-label={isArabic ? "إغلاق القائمة" : "Close menu"}><X /></button>
            </div>
            <nav>
              {primaryLinks.map(({ label, href, Icon }) => {
                const route = href.split("?")[0];
                const active = pathname === route;
                return <Link key={label} href={href} onClick={close} className={active ? "active" : ""}><Icon aria-hidden="true" />{label}</Link>;
              })}
              {categories.slice(0, 4).map((category) => (
                <Link key={category.id} href={`/category/${category.slug}`} onClick={close} className={pathname === `/category/${category.slug}` ? "active" : ""}>
                  <span aria-hidden="true">{category.icon ?? "•"}</span>{isArabic && category.nameAr ? category.nameAr : category.name}
                </Link>
              ))}
            </nav>
            <div className="savo-mobile-drawer-divider" />
            <nav>
              <Link href="/favorites" onClick={close} className={pathname === "/favorites" ? "active" : ""}><Heart aria-hidden="true" />{isArabic ? "المفضلة" : "Favorites"}</Link>
              <Link href="/account" onClick={close} className={pathname === "/account" ? "active" : ""}><User aria-hidden="true" />{isArabic ? "حسابي" : "My Account"}</Link>
              <Link href="/account/orders" onClick={close} className={pathname.startsWith("/account/orders") ? "active" : ""}><Package aria-hidden="true" />{isArabic ? "طلباتي" : "My Orders"}</Link>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
