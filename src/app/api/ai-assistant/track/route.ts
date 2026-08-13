import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startAssistantSession, trackRecommendationClick, trackActionConfirmed } from "@/lib/ai-assistant";
import { z } from "zod";

const schema = z.object({
  event: z.enum(["SESSION_STARTED", "RECOMMENDATION_CLICK", "ACTION_CONFIRMED"]),
  sessionId: z.string().min(1),
  productId: z.string().optional(),
  actionType: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = schema.parse(await req.json());
  const requestingUserId = session?.user?.id ?? null;

  if (body.event === "SESSION_STARTED") {
    await startAssistantSession(body.sessionId, requestingUserId);
  } else if (body.event === "RECOMMENDATION_CLICK" && body.productId) {
    await trackRecommendationClick(body.sessionId, requestingUserId, body.productId);
  } else if (body.event === "ACTION_CONFIRMED") {
    await trackActionConfirmed(body.sessionId, requestingUserId, body.productId, body.actionType ?? "unknown");
  }

  return NextResponse.json({ success: true });
}
