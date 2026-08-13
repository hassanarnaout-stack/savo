import { NextRequest, NextResponse } from "next/server";
import { GiftCardService } from "@/lib/services/gift-card-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(`${getClientIp(req)}:gift-card-check`, RATE_LIMITS.MOBILE_API);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const result = await GiftCardService.checkBalance(code);
  return NextResponse.json(result);
}
