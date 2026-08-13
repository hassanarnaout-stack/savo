import { getMysteryBoxesByTier } from "@/lib/discovery-engine";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { MysteryBoxTiers } from "@/components/home/mystery-box-tiers";
import { Sparkles, Gift, ShieldCheck, TrendingUp } from "lucide-react";
import { getLaunchFlags } from "@/lib/launch-flags";

export const dynamic = "force-dynamic";

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

export default async function MysteryBoxesPage() {
  const locale = await getLocale();
  const FEATURE_FLAGS = await getLaunchFlags();

  // Launch Mode gate (deterministic, checked first) — falls back to the
  // older DB-backed operational flag only if Launch Mode has this ON.
  // Nothing below this point is deleted — just not reached while OFF.
  if (!FEATURE_FLAGS.MYSTERY_BOX_ENABLED) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <Gift className="mx-auto mb-4 h-12 w-12 text-saveo-emerald-700/30" />
        <p className="text-lg font-bold text-saveo-emerald-700">
          {locale === "ar" ? "صناديق المفاجآت — قريباً" : "Mystery Boxes — Coming Soon"}
        </p>
        <p className="mt-2 text-sm text-saveo-emerald-700/50">
          {locale === "ar" ? "هذي الميزة رح تكون متاحة قريباً." : "This feature will be available soon."}
        </p>
      </div>
    );
  }

  const [tiers] = await Promise.all([getMysteryBoxesByTier()]);
  const faq = locale === "ar" ? FAQ_AR : FAQ_EN;
  const isAr = locale === "ar";

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-saveo-emerald-800 to-saveo-emerald-700 py-16 text-center text-white sm:py-24">
        <Gift className="mx-auto h-12 w-12 text-saveo-gold-400" />
        <h1 className="mt-4 text-3xl font-black sm:text-5xl">
          {isAr ? "صناديق المفاجآت" : "Mystery Boxes"}
        </h1>
        <p className="mx-auto mt-4 max-w-xl px-4 text-white/60">
          {isAr
            ? "قيمة مضمونة أكبر من السعر، ومفاجأة مختلفة في كل مرة. صندوق واحد، إثارة لا تنتهي."
            : "Guaranteed value beyond the price, and a different surprise every time. One box, endless excitement."}
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <HowItWorksCard
            icon={<TrendingUp className="h-6 w-6" />}
            title={isAr ? "قيمة أكبر من السعر" : "Value Beyond Price"}
            body={isAr ? "كل صندوق مضمون بقيمة أعلى بكثير مما تدفعه." : "Every box is guaranteed to be worth more than you pay."}
          />
          <HowItWorksCard
            icon={<Sparkles className="h-6 w-6" />}
            title={isAr ? "مفاجأة حقيقية" : "A Real Surprise"}
            body={isAr ? "المحتوى ما يُكشف إلا بعد إتمام طلبك — إثارة اكتشاف أصيلة." : "Contents stay hidden until after checkout — genuine unboxing excitement."}
          />
          <HowItWorksCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title={isAr ? "موردون موثوقون" : "Trusted Suppliers"}
            body={isAr ? "كل المنتجات المحتملة من موردين معتمدين بسافو." : "Every possible item comes from a Savo-verified supplier."}
          />
        </div>
      </section>

      {/* The three boxes */}
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-center text-2xl font-black text-saveo-emerald-700">
          {isAr ? "اختر مستوى مفاجأتك" : "Choose Your Tier"}
        </h2>
        <MysteryBoxTiers
          tiers={tiers as any}
          locale={locale}
          labels={{
            bronze: isAr ? "برونزي" : "Bronze",
            silver: isAr ? "فضي" : "Silver",
            gold: isAr ? "ذهبي" : "Gold",
            guaranteedValue: isAr ? "قيمة مضمونة" : "Guaranteed value",
          }}
        />
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-center text-2xl font-black text-saveo-emerald-700">
          {isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
        </h2>
        <div className="space-y-3">
          {faq.map((f, i) => (
            <details key={i} className="card group p-5">
              <summary className="cursor-pointer list-none font-bold text-saveo-emerald-800">{f.q}</summary>
              <p className="mt-2 text-sm text-saveo-emerald-700/60">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 pb-16 text-center sm:px-6 lg:px-8">
        <Link href="/category/mystery-boxes" className="btn-primary mx-auto">
          <Gift className="h-4 w-4" />
          {isAr ? "تسوّق كل الصناديق" : "Shop All Boxes"}
        </Link>
      </section>
    </div>
  );
}

function HowItWorksCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-saveo-emerald-50 text-saveo-emerald-700">
        {icon}
      </div>
      <p className="mt-3 font-bold text-saveo-emerald-800">{title}</p>
      <p className="mt-1 text-sm text-saveo-emerald-700/60">{body}</p>
    </div>
  );
}
