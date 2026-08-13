import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CollectUnlockService, CampaignNotActiveError } from "@/lib/services/collect-unlock-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    await CollectUnlockService.collect(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CampaignNotActiveError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not record collect action." }, { status: 500 });
  }
}
