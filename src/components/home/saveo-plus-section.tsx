import { Link } from "@/i18n/routing";
import { Crown, Percent, Sparkles, Gift, Truck } from "lucide-react";

export function SaveoPlusSection({
  title,
  subtitle,
  benefits,
  joinLabel,
}: {
  title: string;
  subtitle: string;
  benefits: string[];
  joinLabel: string;
}) {
  const icons = [Percent, Sparkles, Gift, Truck];

  return (
    <section className="saveo-aura shadow-luxury relative overflow-hidden rounded-xl2 bg-gradient-to-br from-saveo-emerald-800 to-saveo-emerald-700 p-8 text-white sm:p-12">
      <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-saveo-gold-400 px-3 py-1 text-xs font-bold text-saveo-emerald-900">
            <Crown className="h-3.5 w-3.5" /> Savo Plus
          </span>
          <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-md text-white/60">{subtitle}</p>
          <Link href="/account" className="btn-primary mt-6 !bg-saveo-gold-400 !text-saveo-emerald-900 hover:!bg-saveo-gold-300">
            {joinLabel}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:w-auto">
          {benefits.map((b, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div key={i} className="w-32 rounded-xl2 bg-white/10 p-4 backdrop-blur-sm">
                <Icon className="h-5 w-5 text-saveo-gold-400" />
                <p className="mt-2 text-xs font-medium leading-snug text-white/90">{b}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
