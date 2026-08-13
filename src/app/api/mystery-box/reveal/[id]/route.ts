import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { openMysteryBoxReveal, RevealOwnershipError, AlreadyRevealedError } from "@/lib/mystery-box";
import { MysteryBoxAnalytics } from "@/lib/mystery-box-analytics";
import { AnalyticsService } from "@/lib/services/analytics-service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { id } = await params;

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const r = await openMysteryBoxReveal(tx, { revealId: id, userId: session.user!.id });
      const reveal = await tx.mysteryBoxReveal.findUniqueOrThrow({
        where: { id },
        include: { orderItem: true },
      });
      return { ...r, mysteryBoxProductId: reveal.orderItem.productId };
    });
  } catch (err) {
    if (err instanceof RevealOwnershipError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (err instanceof AlreadyRevealedError) {
      return NextResponse.json({ error: "Already opened" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not open the box" }, { status: 500 });
  }

  MysteryBoxAnalytics.revealed(result.mysteryBoxProductId, session.user.id, id);

  // Brand Center (Phase 5.4 §9) — increment the real open count for any brand sponsoring this box.
  prisma.brandSponsoredBox
    .updateMany({ where: { mysteryBoxId: result.mysteryBoxProductId }, data: { opens: { increment: 1 } } })
    .catch(() => {});
  AnalyticsService.track({
    type: "MYSTERY_BOX_OPEN",
    sessionId: session.user.id,
    userId: session.user.id,
    productId: result.mysteryBoxProductId,
  });

  return NextResponse.json({ success: true });
}
