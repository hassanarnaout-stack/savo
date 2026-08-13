import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { NotificationService } from "@/lib/notifications/service";
import { z } from "zod";

const schema = z.object({
  subject: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
});

interface Params {
  params: Promise<{ id: string }>; // orderId
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:order-issue`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many reports submitted. Please wait a moment." }, { status: 429 });
  }

  const { id: orderId } = await params;
  const body = schema.parse(await req.json());

  // Ownership check — a customer may only report an issue on their own order.
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const issue = await prisma.orderIssue.create({
    data: { orderId, userId: session.user.id, subject: body.subject, description: body.description },
  });

  logger.info("Order issue reported", { orderId, issueId: issue.id, userId: session.user.id });

  const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { email: true } });
  const parentOrder = await prisma.order.findUnique({ where: { id: orderId }, select: { orderNumber: true } });
  for (const admin of admins) {
    NotificationService.dispatch({
      type: "CUSTOMER_ISSUE_CREATED",
      recipientEmail: admin.email,
      data: { subject: body.subject, orderNumber: parentOrder?.orderNumber ?? orderId },
    });
  }

  return NextResponse.json({ success: true, issue });
}
