import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { TreasureMapExperience } from "@/components/campaigns/treasure-map-experience";
import { getLaunchFlags } from "@/lib/launch-flags";

export const dynamic = "force-dynamic";

export default async function TreasureMapPage() {
  const FEATURE_FLAGS = await getLaunchFlags();
  if (!FEATURE_FLAGS.GAMIFICATION_ENABLED) notFound();

  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user) redirect(`/${locale}/login?callbackUrl=/treasure-map`);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <TreasureMapExperience locale={locale} />
    </div>
  );
}
