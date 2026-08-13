import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TreasureChestService, AlreadyOpenedTodayError, CampaignNotActiveError } from "@/lib/services/treasure-chest-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  // Defense in depth on top of the DB-level daily check — a burst of
  // rapid-fire requests from one account shouldn't even reach that check
  // repeatedly.
  const rateLimit = checkRateLimit(`${getClientIp(req)}:treasure-open`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  try {
    const reward = await TreasureChestService.open(session.user.id);
    return NextResponse.json({ success: true, reward });
  } catch (err) {
    if (err instanceof AlreadyOpenedTodayError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof CampaignNotActiveError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not open the chest. Please try again." }, { status: 500 });
  }
}
