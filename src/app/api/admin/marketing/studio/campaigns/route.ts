import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { MarketingCampaignService } from "@/lib/services/marketing-campaign-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["PRODUCT", "FLASH_DEAL", "MYSTERY_BOX", "SAVEO_PLUS", "SUPPLIER", "CATEGORY", "SEASONAL"]),
  objective: z.enum(["SALES", "TRAFFIC", "CUSTOMERS", "RETENTION", "AWARENESS"]),
  budget: z.number().positive(),
  startAt: z.string(),
  endAt: z.string(),
  variantOfId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const campaign = await MarketingCampaignService.create({
    ...body,
    startAt: new Date(body.startAt),
    endAt: new Date(body.endAt),
    createdByUserId: session.user!.id!,
  });

  // Audit log (§11) — every campaign create/modify is logged.
  logger.info("Marketing campaign created", { campaignId: campaign.id, name: campaign.name, byUserId: session.user!.id });

  return NextResponse.json({ success: true, campaign });
}
