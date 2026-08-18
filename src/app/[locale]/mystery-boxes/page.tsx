import { getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getLaunchFlags } from "@/lib/launch-flags";
import { getMysteryBoxTierConfigs, isGoldBoxEligible } from "@/lib/mystery-box-tiers";
import { MysteryBoxExperience } from "@/components/mystery-box/mystery-box-experience";
import { Gift } from "lucide-react";

/**
 * SAVO Mystery Box — 2026 approved Figma experience (Collection →
 * Build → Locked). The old digital-reveal-era presentation (hero copy,
 * How It Works cards, tier grid, old FAQ mentioning "open your box")
 * is retired per the final business decision — this is now the ONLY
 * customer Mystery Box flow. Real data only: getMysteryBoxTierConfigs()
 * reads real Product/MysteryBoxContent rows; zero Figma mock products.
 */
export const dynamic = "force-dynamic"; // reads the real signed-in session for SAVO Plus eligibility

const FAQ_EN = [
  { q: "How do you decide what's in the box?", a: "Each box draws from a curated pool of products, with your minimum guaranteed value always honored." },
  { q: "What if I don't like what I get?", a: "Every box is worth more than you paid, guaranteed. It's about the thrill of discovery, not a specific item." },
  { q: "When do I find out what's inside?", a: "Only when your box physically arrives — the mystery items are never shown online, before or after your order." },
  { q: "Are Mystery Boxes restocked?", a: "Yes, regularly with new surprises. Availability is limited per batch, so boxes can sell out." },
];
const FAQ_AR = [
  { q: "كيف تقررون محتوى الصندوق؟", a: "كل صندوق يُختار من مجموعة منتقاة، مع ضمان القيمة الدنيا دايماً." },
  { q: "شو لو ما عجبني اللي طلع؟", a: "كل صندوق قيمته أكبر من سعره، مضمون. الفكرة إثارة الاكتشاف، مو منتج محدد." },
  { q: "متى بعرف شو بداخل الصندوق؟", a: "فقط لما يوصلك صندوقك فعليًا — المنتجات الغامضة ما تُعرض أونلاين أبدًا، قبل أو بعد الطلب." },
  { q: "هل صناديق المفاجآت تتجدد؟", a: "أكيد، بانتظام بمفاجآت جديدة. الكمية محدودة بكل دفعة، فممكن تنفد." },
];

export default async function MysteryBoxesPage() {
  const locale = await getLocale();
  const isArabic = locale === "ar";
  const FEATURE_FLAGS = await getLaunchFlags();

  if (!FEATURE_FLAGS.MYSTERY_BOX_ENABLED) {
    return (
      <div className="savo-mystery-page savo-mystery-disabled">
        <Gift size={44} />
        <p>{isArabic ? "صناديق المفاجآت — قريباً" : "Mystery Boxes — Coming Soon"}</p>
        <span>{isArabic ? "هذي الميزة رح تكون متاحة قريباً." : "This feature will be available soon."}</span>
      </div>
    );
  }

  const session = await auth();
  const [tiers, isGoldEligible] = await Promise.all([
    getMysteryBoxTierConfigs(),
    isGoldBoxEligible(session?.user?.id),
  ]);
  const faq = isArabic ? FAQ_AR : FAQ_EN;

  return (
    <div style={{ backgroundColor: "#090b10" }}>
      <MysteryBoxExperience tiers={tiers as any} isGoldEligible={isGoldEligible} locale={locale} />

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#f0f2f7", marginBottom: 20 }}>
          {isArabic ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faq.map((f, i) => (
            <details key={i} style={{ background: "#0f1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px" }}>
              <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#f0f2f7" }}>{f.q}</summary>
              <p style={{ fontSize: 13, color: "#8b95a8", marginTop: 10, lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
