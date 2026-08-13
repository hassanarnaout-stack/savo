import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { AdContentGeneratorService } from "@/lib/services/ad-content-generator-service";
import { z } from "zod";

const schema = z.object({
  campaignId: z.string().optional(),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  subject: z.string().min(1),
  targetAudience: z.string().optional(),
  platform: z.string().min(1),
  tone: z.string().min(1),
  goal: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const adContent = await AdContentGeneratorService.generateAndSave({
    ...body,
    targetAudience: body.targetAudience ?? "",
    createdByUserId: session.user!.id!,
  });

  return NextResponse.json({ success: true, adContent });
}
