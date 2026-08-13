import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { AnalyticsService } from "@/lib/services/analytics-service";
import { z } from "zod";

const schema = z.object({
  page: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  category: z.enum(["PRODUCT", "DELIVERY", "CHECKOUT", "WEBSITE", "OTHER"]),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`${getClientIp(req)}:feedback`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many submissions. Please wait a moment." }, { status: 429 });
  }

  const session = await auth(); // optional — feedback can be anonymous
  const body = schema.parse(await req.json());

  const feedback = await prisma.feedback.create({
    data: {
      userId: session?.user?.id ?? null,
      page: body.page,
      rating: body.rating,
      category: body.category,
      comment: body.comment,
    },
  });

  AnalyticsService.track({
    type: "FEEDBACK_SENT",
    sessionId: session?.user?.id ?? getClientIp(req),
    userId: session?.user?.id,
    metadata: { category: body.category, rating: body.rating },
  });

  return NextResponse.json({ success: true, feedback });
}
