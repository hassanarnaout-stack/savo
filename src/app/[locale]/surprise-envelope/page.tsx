import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { SurpriseEnvelopeExperience } from "@/components/campaigns/surprise-envelope-experience";
import { getLaunchFlags } from "@/lib/launch-flags";

export const dynamic = "force-dynamic";

export default async function SurpriseEnvelopePage() {
  const FEATURE_FLAGS = await getLaunchFlags();
  if (!FEATURE_FLAGS.GAMIFICATION_ENABLED) notFound();

  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user) redirect(`/${locale}/login?callbackUrl=/surprise-envelope`);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <SurpriseEnvelopeExperience locale={locale} />
    </div>
  );
}
