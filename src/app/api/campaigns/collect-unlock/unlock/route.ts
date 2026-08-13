import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CollectUnlockService, CampaignNotActiveError, AlreadyUnlockedError, NotEnoughProgressError } from "@/lib/services/collect-unlock-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    const reward = await CollectUnlockService.unlock(session.user.id);
    return NextResponse.json({ success: true, reward });
  } catch (err) {
    if (err instanceof CampaignNotActiveError || err instanceof AlreadyUnlockedError || err instanceof NotEnoughProgressError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not unlock reward." }, { status: 500 });
  }
}
