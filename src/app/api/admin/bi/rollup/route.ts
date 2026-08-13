import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BIAggregationService } from "@/lib/services/bi-aggregation-service";
import { logger } from "@/lib/logger";

export async function POST() {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await BIAggregationService.rollupAll();
  logger.info("BI rollup executed (manual trigger)", { byUserId: session.user!.id });

  return NextResponse.json({ success: true, ...result });
}
