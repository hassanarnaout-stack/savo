import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PickThreeService, AlreadyPlayedTodayError, CampaignNotActiveError } from "@/lib/services/pick-three-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    const reward = await PickThreeService.pick(session.user.id);
    return NextResponse.json({ success: true, reward });
  } catch (err) {
    if (err instanceof AlreadyPlayedTodayError || err instanceof CampaignNotActiveError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not pick a tile." }, { status: 500 });
  }
}
