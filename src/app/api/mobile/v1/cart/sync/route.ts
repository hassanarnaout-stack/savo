import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MobileAuthService } from "@/lib/services/mobile-auth-service";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })) });

/** Last-write-wins by design — the right tradeoff for a personal cart following one user across their own devices. */
export async function POST(req: NextRequest) {
  const payload = MobileAuthService.verifyRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = checkRateLimit(`${payload.userId}:mobile-cart-sync`, RATE_LIMITS.MOBILE_API);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { items } = schema.parse(await req.json());

  const cart = await prisma.mobileCartSync.upsert({
    where: { userId: payload.userId },
    create: { userId: payload.userId, itemsJson: items },
    update: { itemsJson: items },
  });

  return NextResponse.json({ success: true, updatedAt: cart.updatedAt });
}

export async function GET(req: NextRequest) {
  const payload = MobileAuthService.verifyRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cart = await prisma.mobileCartSync.findUnique({ where: { userId: payload.userId } });
  return NextResponse.json({ items: cart?.itemsJson ?? [], updatedAt: cart?.updatedAt ?? null });
}
