import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AffiliateDashboardClient } from "@/components/affiliate/affiliate-dashboard-client";
import { FeatureFlagService } from "@/lib/services/feature-flag-service";

export default async function AffiliatePage() {
  const enabled = await FeatureFlagService.isEnabled("affiliate_program");
  if (!enabled) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <p className="text-lg font-bold text-saveo-emerald-700">Affiliate Program Unavailable</p>
        <p className="mt-2 text-sm text-saveo-emerald-700/50">The Savo Affiliate Program is temporarily unavailable. Please check back later.</p>
      </div>
    );
  }

  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/affiliate");

  const account = await prisma.affiliateAccount.findUnique({ where: { userId: session.user.id } });

  return <AffiliateDashboardClient hasAccount={!!account} />;
}
