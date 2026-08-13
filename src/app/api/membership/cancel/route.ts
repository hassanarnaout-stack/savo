import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    await MembershipService.cancel(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not cancel membership" }, { status: 400 });
  }
}
