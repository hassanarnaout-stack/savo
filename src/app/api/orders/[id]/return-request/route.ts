import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  reason: z.string().min(5).max(1000),
  images: z.array(z.string().url()).max(5).optional(),
});

interface Params {
  params: Promise<{ id: string }>; // orderId
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:return-request`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const { id: orderId } = await params;
  const body = schema.parse(await req.json());

  // Ownership check (§12) — the order must belong to the requesting customer.
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const returnRequest = await prisma.returnRequest.create({
    data: {
      orderId,
      userId: session.user.id,
      reason: body.reason,
      images: body.images ?? [],
      status: "REQUESTED",
    },
  });

  return NextResponse.json({ success: true, returnRequest });
}
