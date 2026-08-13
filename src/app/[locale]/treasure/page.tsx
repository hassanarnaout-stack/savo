import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { TreasureChestExperience } from "@/components/campaigns/treasure-chest-experience";
import { getLaunchFlags } from "@/lib/launch-flags";

export const dynamic = "force-dynamic";

export default async function TreasurePage() {
  const FEATURE_FLAGS = await getLaunchFlags();
  if (!FEATURE_FLAGS.GAMIFICATION_ENABLED) notFound();

  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user) redirect(`/${locale}/login?callbackUrl=/treasure`);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <TreasureChestExperience locale={locale} />
    </div>
  );
}
