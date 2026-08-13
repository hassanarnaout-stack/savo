import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { MarketingCampaignService } from "@/lib/services/marketing-campaign-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({ status: z.enum(["DRAFT", "ACTIVE", "COMPLETED"]) });

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = schema.parse(await req.json());
  const campaign = await MarketingCampaignService.setStatus(id, status);

  logger.info("Marketing campaign status changed", { campaignId: id, status, byUserId: session.user!.id });

  return NextResponse.json({ success: true, campaign });
}
