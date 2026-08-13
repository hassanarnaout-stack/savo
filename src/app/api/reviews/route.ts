import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ReviewService } from "@/lib/services/review-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  packagingRating: z.number().int().min(1).max(5).optional(),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  priceRating: z.number().int().min(1).max(5).optional(),
  mediaUrls: z.array(z.object({ url: z.string().url(), type: z.enum(["IMAGE", "VIDEO"]) })).max(5).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to leave a review." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:review-create`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = schema.parse(await req.json());
  const review = await ReviewService.createReview({ userId: session.user.id, ...body });

  return NextResponse.json({ success: true, review });
}
