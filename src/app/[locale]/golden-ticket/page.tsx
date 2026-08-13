import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { CampaignService } from "@/lib/services/campaign-service";
import { Ticket, Sparkles } from "lucide-react";
import { getLaunchFlags } from "@/lib/launch-flags";

export const dynamic = "force-dynamic";

export default async function GoldenTicketPage() {
  const FEATURE_FLAGS = await getLaunchFlags();
  if (!FEATURE_FLAGS.GAMIFICATION_ENABLED) notFound();

  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user) redirect(`/${locale}/login?callbackUrl=/golden-ticket`);

  const campaign = await CampaignService.getBySlug("golden-ticket");
  const odds = (campaign?.config as any)?.odds ?? 20;

  const wins = campaign
    ? await prisma.campaignEvent.findMany({
        where: { userId: session.user.id, campaignId: campaign.id, eventType: "REWARD_RECEIVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  if (campaign) {
    CampaignService.recordEvent({ userId: session.user.id, campaignId: campaign.id, eventType: "VIEW" });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <Ticket className="mx-auto h-14 w-14 text-saveo-gold-500" />
      <h1 className="mt-4 text-2xl font-black text-saveo-emerald-700">
        {locale === "ar" ? "🎫 التذكرة الذهبية" : "🎫 Golden Ticket"}
      </h1>
      <p className="mt-2 text-sm text-saveo-emerald-700/50">
        {locale === "ar"
          ? (campaign?.customerDescriptionAr || `كل طلب هو فرصة! فرصة الفوز 1 من كل ${odds} طلب — مفاجأة تلقائية بدون أي شي تسويه.`)
          : (campaign?.customerDescription || `Every order is a chance! You have a 1-in-${odds} chance on every order — a total surprise, no action needed.`)}
      </p>

      {!campaign || campaign.status !== "ACTIVE" ? (
        <p className="mt-10 text-saveo-emerald-700/40">
          {locale === "ar" ? "النظام غير مفعّل حالياً." : "This system isn't currently active."}
        </p>
      ) : (
        <div className="mt-8 text-start">
          <h2 className="mb-3 text-center text-sm font-bold text-saveo-emerald-700">
            {locale === "ar" ? "تذاكرك الفائزة" : "Your Winning Tickets"}
          </h2>
          {wins.length === 0 ? (
            <p className="text-center text-sm text-saveo-emerald-700/40">
              {locale === "ar" ? "لسا ما ربحت — كمّل التسوق!" : "No wins yet — keep shopping!"}
            </p>
          ) : (
            <div className="space-y-2">
              {wins.map((w) => {
                const meta = w.metadata as any;
                return (
                  <div key={w.id} className="card-float shadow-luxury flex items-center gap-3 rounded-xl2 bg-saveo-gold-50 p-3">
                    <Sparkles className="h-5 w-5 shrink-0 text-saveo-gold-500" />
                    <div>
                      <p className="text-sm font-bold text-saveo-emerald-800">{meta?.label ?? "Golden Ticket Prize"}</p>
                      <p className="text-xs text-saveo-emerald-700/40">{new Date(w.createdAt).toLocaleDateString(locale === "ar" ? "ar-KW" : "en-GB")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
