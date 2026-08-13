import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(20),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  const subscription = await SubscriptionService.create({ userId: session.user.id, ...body });
  return NextResponse.json({ success: true, subscription });
}
