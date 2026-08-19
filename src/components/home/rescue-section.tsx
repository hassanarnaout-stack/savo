import { Link } from "@/i18n/routing";
import { RescueCard } from "./rescue-card";

/**
 * SAVO Smart Savings homepage section (internal system name: Rescue —
 * unchanged: Product.type=RESCUE, expiryDate, eligibility/discount
 * logic, admin/supplier terminology all stay RESCUE). Only the
 * CUSTOMER-FACING copy changed, per approval:
 *   SAVO RESCUE → SAVO SMART SAVINGS
 *   Smart savings · Responsible commerce → Smart savings · Limited opportunities
 *   A smart discovery worth saving. → unchanged
 *   Expires in X days → Offer ends in X days
 *   All rescue → → View all savings →
 * "Offer ends in X days" is still computed here from the real
 * Product.expiryDate — never fabricated, never shown when absent.
 * Each card's cart icon is the canonical product-card add-to-cart
 * action (RescueCard), not a text CTA.
 */
interface RescueProduct {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  brandName: string | null;
  originalPrice: number;
  saveoPrice: number;
  expiryDate: string | null;
  image: string | null;
}

function calcDiscountPct(original: number, current: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - current) / original) * 100);
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.round(ms / 86400000));
}

export function RescueSection({ products, locale }: { products: RescueProduct[]; locale: string }) {
  const isArabic = locale === "ar";
  if (products.length === 0) return null;

  return (
    <section className="savo-rescue">
      <div className="savo-rescue-head">
        <div>
          <p className="savo-products-eyebrow">{isArabic ? "سافو للإنقاذ" : "SAVO RESCUE"}</p>
          <h2 className="savo-rescue-title">{isArabic ? "توفير ذكي. هدر أقل." : "Smart savings. Less waste."}</h2>
          <p className="savo-rescue-sub">{isArabic ? "اكتشف منتجات رائعة بأسعار أفضل، وامنح كل منتج فرصة يُستمتع فيها." : "Discover great products at better prices and give every product a chance to be enjoyed."}</p>
        </div>
        <Link href="/products?type=RESCUE" className="savo-rescue-viewall">{isArabic ? "كل منتجات الإنقاذ ←" : "All Rescue →"}</Link>
      </div>

      <div className="savo-rescue-row">
        {products.map((p) => {
          const discountPct = calcDiscountPct(p.originalPrice, p.saveoPrice);
          const days = p.expiryDate ? daysUntil(p.expiryDate) : null;
          const displayName = isArabic && p.nameAr ? p.nameAr : p.name;
          return (
            <RescueCard
              key={p.id}
              id={p.id}
              name={displayName}
              slug={p.slug}
              brandName={p.brandName}
              originalPrice={p.originalPrice}
              saveoPrice={p.saveoPrice}
              image={p.image}
              discountPct={discountPct}
              offerEndsDays={days}
              isArabic={isArabic}
            />
          );
        })}
      </div>
    </section>
  );
}
