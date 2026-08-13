import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MobileAuthService } from "@/lib/services/mobile-auth-service";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

/**
 * Wishlist Sync (Phase 7.6) — reuses the existing Favorite model
 * (same one the web app's heart-icon favoriting writes to), so a
 * product favorited on web instantly shows as favorited on mobile
 * and vice versa. No separate mobile-only wishlist table.
 */
const addSchema = z.object({ productId: z.string() });

export async function GET(req: NextRequest) {
  const payload = MobileAuthService.verifyRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = checkRateLimit(`${payload.userId}:mobile-wishlist`, RATE_LIMITS.MOBILE_API);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const favorites = await prisma.favorite.findMany({
    where: { userId: payload.userId },
    select: { productId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ productIds: favorites.map((f) => f.productId), syncedAt: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  const payload = MobileAuthService.verifyRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = addSchema.parse(await req.json());
  await prisma.favorite.upsert({
    where: { userId_productId: { userId: payload.userId, productId } },
    create: { userId: payload.userId, productId },
    update: {},
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const payload = MobileAuthService.verifyRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  await prisma.favorite.deleteMany({ where: { userId: payload.userId, productId } });
  return NextResponse.json({ success: true });
}
