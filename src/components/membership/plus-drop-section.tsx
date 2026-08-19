"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { ShoppingCart, CheckCircle2, Lock } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatKWD } from "@/lib/utils";
import { classifyPlusBadge, getEffectivePrice, canAccessPlusProduct } from "@/lib/services/plus-merchandising-service";

/**
 * SAVO Plus Drop — real qualifying products only (Members Only / Early
 * Access / Plus Price), classified server-side by the SAME
 * PlusMerchandisingService used for checkout enforcement, so what's
 * shown always matches what's actually allowed/charged. Non-members
 * see an elegant locked preview for restricted offers rather than a
 * purchasable card; active members get the real canonical add-to-cart
 * action (same pattern as RescueCard — reuses useCartStore.addItem).
 */
interface PlusDropProduct {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  brandName: string | null;
  originalPrice: number;
  saveoPrice: number;
  image: string | null;
  isMembersOnly: boolean;
  plusPrice: number | null;
  earlyAccessStartsAt: string | null;
  publicAccessStartsAt: string | null;
}

const BADGE_LABEL: Record<string, { en: string; ar: string }> = {
  MEMBERS_ONLY: { en: "MEMBERS ONLY", ar: "حصري للأعضاء" },
  EARLY_ACCESS: { en: "EARLY ACCESS", ar: "وصول مبكر" },
  PLUS_PRICE: { en: "PLUS PRICE", ar: "سعر بلس" },
};

function PlusDropCard({ product, isMember, locale }: { product: PlusDropProduct; isMember: boolean; locale: string }) {
  const isArabic = locale === "ar";
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const now = new Date();
  const normalized = {
    isMembersOnly: product.isMembersOnly,
    plusPrice: product.plusPrice,
    earlyAccessStartsAt: product.earlyAccessStartsAt ? new Date(product.earlyAccessStartsAt) : null,
    publicAccessStartsAt: product.publicAccessStartsAt ? new Date(product.publicAccessStartsAt) : null,
    saveoPrice: product.saveoPrice,
  };
  const badge = classifyPlusBadge(normalized, now);
  const canAccess = canAccessPlusProduct(normalized, isMember, now);
  const price = getEffectivePrice(normalized, isMember, now);
  const displayName = isArabic && product.nameAr ? product.nameAr : product.name;
  const badgeIsGold = badge === "EARLY_ACCESS";

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!canAccess) return;
    addItem({ productId: product.id, name: displayName, slug: product.slug, image: product.image, originalPrice: product.originalPrice, saveoPrice: price, stockQty: 99 }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  if (!canAccess) {
    return (
      <div className="savo-plusdrop-card savo-plusdrop-card--locked">
        {product.image ? <img src={product.image} alt="" /> : <span className="savo-plusdrop-fallback" />}
        <span className="savo-plusdrop-scrim" />
        {badge && <span className="savo-plusdrop-badge" data-gold={badgeIsGold}>{isArabic ? BADGE_LABEL[badge].ar : BADGE_LABEL[badge].en}</span>}
        <div className="savo-plusdrop-lock">
          <Lock className="h-5 w-5" />
          <span>{isArabic ? "افتح مع بلس" : "UNLOCK WITH PLUS"}</span>
        </div>
        <Link href="/membership" className="savo-plusdrop-unlock-cta">{isArabic ? "انضم لسافو بلس ←" : "Join SAVO Plus →"}</Link>
      </div>
    );
  }

  return (
    <Link href={`/products/${product.slug}`} className="savo-plusdrop-card">
      {product.image ? <img src={product.image} alt={displayName} /> : <span className="savo-plusdrop-fallback" />}
      <span className="savo-plusdrop-scrim" />
      {badge && <span className="savo-plusdrop-badge" data-gold={badgeIsGold}>{isArabic ? BADGE_LABEL[badge].ar : BADGE_LABEL[badge].en}</span>}
      <span className="savo-plusdrop-info">
        {product.brandName && <small>{product.brandName}</small>}
        <strong>{displayName}</strong>
        <span className="savo-plusdrop-footer">
          <b>{formatKWD(price)}</b>
          <button onClick={handleAddToCart} aria-label={isArabic ? "أضف للسلة" : "Add to cart"} className={`savo-pc-add ${added ? "is-added" : ""}`}>
            {added ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
          </button>
        </span>
      </span>
    </Link>
  );
}

export function PlusDropSection({ products, isMember, locale }: { products: PlusDropProduct[]; isMember: boolean; locale: string }) {
  const isArabic = locale === "ar";
  if (products.length === 0) return null; // zero qualifying real products — no fabricated Figma products

  return (
    <section className="savo-plus-section">
      <div className="savo-plusdrop-head">
        <div>
          <p className="savo-plus-eyebrow-sm">{isArabic ? "حصري للأعضاء" : "MEMBERS ONLY"}</p>
          <h2 className="savo-plus-h2">{isArabic ? "إسقاط بلس." : "The Plus Drop."}</h2>
          <p className="savo-plus-drop-sub">{isArabic ? "محجوزة للأعضاء." : "Reserved for members."}</p>
        </div>
        <Link href="/membership" className="savo-plusdrop-viewall">{isArabic ? "عرض الكل ←" : "View all →"}</Link>
      </div>
      <div className="savo-plusdrop-grid">
        {products.map((p) => (
          <PlusDropCard key={p.id} product={p} isMember={isMember} locale={locale} />
        ))}
      </div>
    </section>
  );
}
