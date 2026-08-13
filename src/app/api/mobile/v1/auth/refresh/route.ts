import { NextRequest, NextResponse } from "next/server";
import { MobileAuthService } from "@/lib/services/mobile-auth-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ refreshToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`${getClientIp(req)}:mobile-refresh`, RATE_LIMITS.MOBILE_API);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const { refreshToken } = schema.parse(await req.json());
  const tokens = await MobileAuthService.refreshTokenPair(refreshToken);

  if (!tokens) {
    // Invalid, expired, or already-used (rotated) refresh token — the client must log in again.
    return NextResponse.json({ error: "Invalid or expired refresh token. Please log in again." }, { status: 401 });
  }

  return NextResponse.json({ success: true, ...tokens });
}
