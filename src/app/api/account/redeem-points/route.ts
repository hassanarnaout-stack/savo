import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LoyaltyService, InsufficientPointsError } from "@/lib/services/loyalty-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ points: z.number().int().positive() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:redeem-points`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const { points } = schema.parse(await req.json());

  try {
    const result = await LoyaltyService.redeemForWalletCredit(session.user.id, points);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof InsufficientPointsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not redeem points" }, { status: 500 });
  }
}
