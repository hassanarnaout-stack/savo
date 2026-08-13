import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LimitedTimeHuntService, HuntNotLiveError } from "@/lib/services/limited-time-hunt-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:hunt-claim`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  try {
    const reward = await LimitedTimeHuntService.claim(session.user.id);
    return NextResponse.json({ success: true, reward });
  } catch (err) {
    if (err instanceof HuntNotLiveError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not claim reward" }, { status: 500 });
  }
}
