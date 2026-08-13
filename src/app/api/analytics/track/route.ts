import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_START"]), // only client-triggered types accepted here — the rest are server-side-only
  sessionId: z.string().min(1),
  productId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  // Generous limit — this fires often during normal browsing (page views).
  const rateLimit = checkRateLimit(`${getClientIp(req)}:analytics`, { windowMs: 60_000, maxRequests: 120 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const session = await auth();
  const body = schema.parse(await req.json());

  AnalyticsService.track({
    type: body.type,
    sessionId: body.sessionId,
    userId: session?.user?.id,
    productId: body.productId,
    metadata: body.metadata,
  });

  return NextResponse.json({ ok: true });
}
