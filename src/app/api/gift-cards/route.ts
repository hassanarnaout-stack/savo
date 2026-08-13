import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GiftCardService } from "@/lib/services/gift-card-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().max(100).optional(),
  personalMessage: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to buy a gift card." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:gift-card-purchase`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = schema.parse(await req.json());

  try {
    const card = await GiftCardService.purchase({ purchasedByUserId: session.user.id, ...body });
    return NextResponse.json({ success: true, code: card.code, amount: Number(card.initialValue), expiresAt: card.expiresAt });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not purchase gift card" }, { status: 400 });
  }
}
