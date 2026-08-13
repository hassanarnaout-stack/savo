import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { logger } from "@/lib/logger";

export async function POST() {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await SubscriptionService.processDueSubscriptions();
  logger.info("Subscriptions processed (manual trigger)", { ...result, byUserId: session.user!.id });

  return NextResponse.json({ success: true, ...result });
}
