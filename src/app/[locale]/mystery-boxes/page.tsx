import { getMysteryBoxesByTier } from "@/lib/discovery-engine";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { MysteryBoxTiers } from "@/components/home/mystery-box-tiers";
import { Sparkles, Gift, ShieldCheck, TrendingUp } from "lucide-react";
import { getLaunchFlags } from "@/lib/launch-flags";

/**
 * Site-wide performance pass: zero session/user-specific reads on this
 * page (verified) — force-dynamic was unnecessary. Same ISR pattern as
 * /products, /category/[slug], /discover.
 */
export const revalidate = 30;

const FAQ_EN = [
  { q: "How do you decide what's in the box?", a: "Each box draws from a curated pool of products picked by the supplier, with your minimum guaranteed value always honored." },
  { q: "What if I don't like what I get?", a: "Every box is worth more than you paid, guaranteed. It's about the thrill of discovery, not a specific item." },
  { q: "When do I find out what's inside?", a: "Right after checkout — head to your order and open your box for the full reveal experience." },
  { q: "Are Mystery Boxes restocked?", a: "Yes, regularly with new surprises. Availability is limited per batch, so boxes can sell out." },
];
const FAQ_AR = [
  { q: "كيف تقررون محتوى الصندوق؟", a: "كل صندوق يُختار من مجموعة منتقاة يحددها المورد، مع ضمان القيمة الدنيا دايماً." },
  { q: "شو لو ما عجبني اللي طلع؟", a: "كل صندوق قيمته أكبر من سعره، مضمون. الفكرة إثارة الاكتشاف، مو منتج محدد." },
  { q: "متى بعرف شو بداخل الصندوق؟", a: "فوراً بعد إتمام الطلب — روح لطلبك وافتح الصندوق لتجربة الكشف الكاملة." },
  { q: "هل صناديق المفاجآت تتجدد؟", a: "أكيد، بانتظام بمفاجآت جديدة. الكمية محدودة بكل دفعة، فممكن تنفد." },
];

/**
 * Batch 1 V22 Customer UI Migration — presentation only. Ported from
 * the latest V22 export (CustomerPages.tsx, MysteryBoxesPage()).
 * ZERO changes to the Mystery Box engine: still getMysteryBoxesByTier()
 * (real weighted tiers/pricing/guaranteed value), still gated by the
 * exact same MYSTERY_BOX_ENABLED launch flag, same real FAQ content
 * (unchanged — not V22 marketing copy), same CTA route.
 */
export default async function MysteryBoxesPage() {
  const locale = await getLocale();
  const isArabic = locale === "ar";
  const FEATURE_FLAGS = await getLaunchFlags();

  // Launch Mode gate (deterministic, checked first) — falls back to the
  // older DB-backed operational flag only if Launch Mode has this ON.
  // Nothing below this point is deleted — just not reached while OFF.
  if (!FEATURE_FLAGS.MYSTERY_BOX_ENABLED) {
    return (
      <div className="savo-mystery-page savo-mystery-disabled">
        <Gift size={44} />
        <p>{isArabic ? "صناديق المفاجآت — قريباً" : "Mystery Boxes — Coming Soon"}</p>
        <span>{isArabic ? "هذي الميزة رح تكون متاحة قريباً." : "This feature will be available soon."}</span>
      </div>
    );
  }

  const [tiers] = await Promise.all([getMysteryBoxesByTier()]);
  const faq = isArabic ? FAQ_AR : FAQ_EN;

  return (
    <div className="savo-mystery-page">
      <section className="savo-mystery-hero">
        <Gift size={40} />
        <h1>{isArabic ? "صناديق المفاجآت" : "Mystery Boxes"}</h1>
        <p>
          {isArabic
            ? "قيمة مضمونة أكبر من السعر، ومفاجأة مختلفة في كل مرة. صندوق واحد، إثارة لا تنتهي."
            : "Guaranteed value beyond the price, and a different surprise every time. One box, endless excitement."}
        </p>
      </section>

      <section className="savo-mystery-shell">
        <div className="savo-mystery-how">
          <HowItWorksCard
            icon={<TrendingUp size={22} />}
            title={isArabic ? "قيمة أكبر من السعر" : "Value Beyond Price"}
            body={isArabic ? "كل صندوق مضمون بقيمة أعلى بكثير مما تدفعه." : "Every box is guaranteed to be worth more than you pay."}
          />
          <HowItWorksCard
            icon={<Sparkles size={22} />}
            title={isArabic ? "مفاجأة حقيقية" : "A Real Surprise"}
            body={isArabic ? "المحتوى ما يُكشف إلا بعد إتمام طلبك — إثارة اكتشاف أصيلة." : "Contents stay hidden until after checkout — genuine unboxing excitement."}
          />
          <HowItWorksCard
            icon={<ShieldCheck size={22} />}
            title={isArabic ? "موردون موثوقون" : "Trusted Suppliers"}
            body={isArabic ? "كل المنتجات المحتملة من موردين معتمدين بسافو." : "Every possible item comes from a Savo-verified supplier."}
          />
        </div>
      </section>

      <section className="savo-mystery-shell">
        <h2 className="savo-mystery-section-title">{isArabic ? "اختر مستوى مفاجأتك" : "Choose Your Tier"}</h2>
        <MysteryBoxTiers
          tiers={tiers as any}
          locale={locale}
          labels={{
            bronze: isArabic ? "برونزي" : "Bronze",
            silver: isArabic ? "فضي" : "Silver",
            gold: isArabic ? "ذهبي" : "Gold",
            guaranteedValue: isArabic ? "قيمة مضمونة" : "Guaranteed value",
          }}
        />
      </section>

      <section className="savo-mystery-shell savo-mystery-faq-section">
        <h2 className="savo-mystery-section-title">{isArabic ? "الأسئلة الشائعة" : "Frequently Asked Questions"}</h2>
        <div className="savo-mystery-faq-list">
          {faq.map((f, i) => (
            <details key={i} className="savo-mystery-faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="savo-mystery-cta-section">
        <Link href="/category/mystery-boxes" className="savo-mystery-cta">
          <Gift size={16} />
          {isArabic ? "تسوّق كل الصناديق" : "Shop All Boxes"}
        </Link>
      </section>
    </div>
  );
}

function HowItWorksCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="savo-mystery-how-card">
      <div className="savo-mystery-how-icon">{icon}</div>
      <p className="savo-mystery-how-title">{title}</p>
      <p className="savo-mystery-how-body">{body}</p>
    </div>
  );
}
