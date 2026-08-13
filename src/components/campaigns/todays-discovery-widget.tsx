import Link from "next/link";
import { CampaignService } from "@/lib/services/campaign-service";
import { Gift, Lock, Ticket, Map as MapIcon, Search, Sparkles, Mail, Stamp, Wallet } from "lucide-react";

/**
 * Today's Discovery — Phase 5.2 §8.
 *
 * Purely reads whichever campaigns CampaignService.getActiveCampaigns()
 * currently returns (max 2, highest priority first). Admin changes which
 * campaign shows here entirely through /admin/marketing/campaigns —
 * nothing on this component ever needs editing when campaigns rotate.
 */

const CAMPAIGN_DISPLAY: Record<string, { icon: any; emoji: string; path: string }> = {
  TREASURE_CHEST: { icon: Gift, emoji: "🎁", path: "/treasure" },
  MYSTERY_SAFE: { icon: Lock, emoji: "🔐", path: "/mystery-safe" },
  GOLDEN_TICKET: { icon: Ticket, emoji: "🎫", path: "/golden-ticket" },
  TREASURE_MAP: { icon: MapIcon, emoji: "🗺️", path: "/treasure-map" },
  LIMITED_TIME_HUNT: { icon: Search, emoji: "🔍", path: "/hunt" },
  SURPRISE_ENVELOPE: { icon: Mail, emoji: "💌", path: "/surprise-envelope" },
  PICK_THREE: { icon: Sparkles, emoji: "🎲", path: "/pick-three" },
  COLLECT_UNLOCK: { icon: Stamp, emoji: "🎯", path: "/collect-unlock" },
  HIDDEN_CASHBACK: { icon: Wallet, emoji: "💰", path: "/hidden-cashback" },
};

export async function TodaysDiscoveryWidget({ locale }: { locale: string }) {
  const campaigns = await CampaignService.getActiveCampaigns();
  if (campaigns.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h2 className="mb-4 text-lg font-bold text-saveo-emerald-700">
        {locale === "ar" ? "✨ اكتشاف اليوم" : "✨ Today's Discovery"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((campaign) => {
          const display = CAMPAIGN_DISPLAY[campaign.type] ?? { icon: Sparkles, emoji: "✨", path: "/" };
          const Icon = display.icon;
          return (
            <Link
              key={campaign.id}
              href={`/${locale}${display.path}`}
              className="flex items-center gap-4 rounded-xl2 bg-gradient-to-br from-saveo-emerald-700 to-saveo-emerald-900 p-5 text-white transition-transform hover:scale-[1.01]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-saveo-gold-400">
                <Icon className="h-7 w-7 text-saveo-emerald-900" />
              </div>
              <div>
                <p className="text-lg font-black">{display.emoji} {campaign.name}</p>
                <p className="text-xs text-white/60">
                  {locale === "ar" ? "دوس لتشارك اليوم" : "Tap to play today"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
