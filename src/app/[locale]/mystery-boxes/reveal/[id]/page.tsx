import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

/**
 * RETIRED (2026 approved Figma decision) — the old digital "Open
 * Mystery Box" reveal page is cancelled. This route is kept (not
 * deleted) only to safely redirect any old bookmarked/shared reveal
 * URL to the customer's real order details, WITHOUT ever fetching or
 * rendering MysteryBoxRevealItem content — the physical unboxing at
 * delivery is the only reveal, no exceptions for historical URLs
 * either.
 */
export default async function MysteryBoxRevealPageRetired({ params }: Props) {
  const { id, locale } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/mystery-boxes`);

  // Only look up ownership + the linked order — never `items` (the
  // actual hidden contents) or `chosenProductIds`.
  const reveal = await prisma.mysteryBoxReveal.findUnique({
    where: { id },
    select: { userId: true, orderItem: { select: { supplierOrder: { select: { orderId: true } } } } },
  });

  if (!reveal || reveal.userId !== session.user.id) notFound();

  redirect(`/${locale}/account/orders/${reveal.orderItem.supplierOrder.orderId}`);
}
