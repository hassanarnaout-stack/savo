import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MembershipService } from "@/lib/services/membership-service";
import { z } from "zod";

const schema = z.object({
  planId: z.string().min(1),
  pricingOptionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = schema.parse(await req.json());

  try {
    const membership = await MembershipService.subscribe({
      userId: session.user.id,
      planId: body.planId,
      pricingOptionId: body.pricingOptionId,
    });
    return NextResponse.json({ success: true, endsAt: membership.endsAt });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not activate membership" }, { status: 400 });
  }
}
