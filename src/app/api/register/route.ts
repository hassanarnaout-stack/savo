import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { BetaService } from "@/lib/services/beta-service";
import { NotificationService } from "@/lib/notifications/service";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`${ip}:register`, RATE_LIMITS.REGISTER);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit exceeded on register", { ip });
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
    );
  }

  const body = schema.parse(await req.json());

  const canRegister = await BetaService.canRegister(body.email, "CUSTOMER");
  if (!canRegister) {
    return NextResponse.json(
      { error: "Savo is currently invite-only. Please contact us for access." },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  await prisma.user.create({
    data: { name: body.name, email: body.email, passwordHash, role: "CUSTOMER" },
  });
  await BetaService.markInviteRegistered(body.email);

  NotificationService.dispatch({
    type: "WELCOME_EMAIL",
    recipientEmail: body.email,
    data: { name: body.name },
  });

  return NextResponse.json({ success: true });
}
