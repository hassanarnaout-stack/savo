import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { z } from "zod";

const schema = z.object({ action: z.enum(["PAUSE", "RESUME", "CANCEL"]) });

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { id } = await params;
  const { action } = schema.parse(await req.json());

  const sub = await prisma.productSubscription.findUnique({ where: { id }, select: { userId: true } });
  if (!sub || sub.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = action === "PAUSE" ? await SubscriptionService.pause(id)
    : action === "RESUME" ? await SubscriptionService.resume(id)
    : await SubscriptionService.cancel(id);

  return NextResponse.json({ success: true, subscription: updated });
}
