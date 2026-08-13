import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { HiddenCashbackService, AlreadyRevealedTodayError, CampaignNotActiveError } from "@/lib/services/hidden-cashback-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    const result = await HiddenCashbackService.reveal(session.user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof AlreadyRevealedTodayError || err instanceof CampaignNotActiveError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not reveal cashback." }, { status: 500 });
  }
}
