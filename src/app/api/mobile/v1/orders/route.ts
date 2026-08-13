import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MobileAuthService } from "@/lib/services/mobile-auth-service";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const payload = MobileAuthService.verifyRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${payload.userId}:mobile-orders`, RATE_LIMITS.MOBILE_API);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const orders = await prisma.order.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, orderNumber: true, status: true, total: true, createdAt: true,
      supplierOrders: { select: { items: { select: { productName: true, quantity: true, lineTotal: true } } } },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt,
      items: o.supplierOrders.flatMap((so) => so.items.map((i) => ({ name: i.productName, quantity: i.quantity, lineTotal: Number(i.lineTotal) }))),
    })),
  });
}
