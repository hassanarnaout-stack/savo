import { NextRequest, NextResponse } from "next/server";
import { peekRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const { email } = schema.parse(await req.json());

  const status = peekRateLimit(`login:${email.toLowerCase()}`, RATE_LIMITS.LOGIN);

  return NextResponse.json({
    limited: !status.allowed,
    retryAfterSeconds: status.allowed ? 0 : Math.ceil((status.resetAt - Date.now()) / 1000),
  });
}
