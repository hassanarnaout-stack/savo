import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MysterySafeService, AlreadyOpenedSafeTodayError, NoKeyAvailableError } from "@/lib/services/mystery-safe-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:safe-open`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  try {
    const reward = await MysterySafeService.open(session.user.id);
    return NextResponse.json({ success: true, reward });
  } catch (err) {
    if (err instanceof AlreadyOpenedSafeTodayError || err instanceof NoKeyAvailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not open the safe. Please try again." }, { status: 500 });
  }
}
