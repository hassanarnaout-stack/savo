import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TreasureMapService } from "@/lib/services/treasure-map-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ nodeId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:map-claim`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  const { nodeId } = schema.parse(await req.json());

  try {
    const reward = await TreasureMapService.claimNode(session.user.id, nodeId);
    return NextResponse.json({ success: true, reward });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not claim this stamp" }, { status: 409 });
  }
}
