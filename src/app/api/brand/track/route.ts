import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SponsoredBillingService } from "@/lib/services/sponsored-billing-service";
import { z } from "zod";

const schema = z.object({
  slotId: z.string().min(1),
  eventType: z.enum(["ADD_TO_CART", "IMPRESSION", "CLICK"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = schema.parse(await req.json());

  const slot = await prisma.sponsoredSlot.findUnique({ where: { id: body.slotId }, select: { id: true, brandId: true } });
  if (!slot) return NextResponse.json({ ok: false }, { status: 404 });

  if (body.eventType === "IMPRESSION") {
    await SponsoredBillingService.recordImpression(slot.id, slot.brandId, session?.user?.id);
    return NextResponse.json({ ok: true });
  }
  if (body.eventType === "CLICK") {
    await SponsoredBillingService.recordClick(slot.id, slot.brandId, session?.user?.id);
    return NextResponse.json({ ok: true });
  }

  await prisma.brandEvent
    .create({ data: { brandId: slot.brandId, eventType: body.eventType, userId: session?.user?.id, metadata: { slotId: slot.id } } })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
