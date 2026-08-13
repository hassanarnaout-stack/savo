import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MobileAuthService } from "@/lib/services/mobile-auth-service";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ token: z.string().min(1), platform: z.enum(["IOS", "ANDROID"]) });

export async function POST(req: NextRequest) {
  const payload = MobileAuthService.verifyRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${payload.userId}:mobile-push-token`, RATE_LIMITS.MOBILE_API);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const { token, platform } = schema.parse(await req.json());

  const pushToken = await prisma.pushToken.upsert({
    where: { token },
    create: { userId: payload.userId, token, platform },
    update: { userId: payload.userId, platform },
  });

  return NextResponse.json({ success: true, pushToken });
}
