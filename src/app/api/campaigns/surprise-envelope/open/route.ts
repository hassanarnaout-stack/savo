import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SurpriseEnvelopeService, AlreadyOpenedTodayError, CampaignNotActiveError } from "@/lib/services/surprise-envelope-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    const reward = await SurpriseEnvelopeService.open(session.user.id);
    return NextResponse.json({ success: true, reward });
  } catch (err) {
    if (err instanceof AlreadyOpenedTodayError || err instanceof CampaignNotActiveError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not open envelope." }, { status: 500 });
  }
}
