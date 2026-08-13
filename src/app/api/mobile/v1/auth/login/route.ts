import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { MobileAuthService } from "@/lib/services/mobile-auth-service";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ email: z.string().email(), password: z.string().min(1), deviceInfo: z.string().optional() });

export async function POST(req: NextRequest) {
  const { email, password, deviceInfo } = schema.parse(await req.json());

  const rateLimit = checkRateLimit(`login:${email.toLowerCase()}`, RATE_LIMITS.LOGIN);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const tokens = await MobileAuthService.issueTokenPair(user.id, user.role, deviceInfo);

  return NextResponse.json({
    success: true,
    ...tokens,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
