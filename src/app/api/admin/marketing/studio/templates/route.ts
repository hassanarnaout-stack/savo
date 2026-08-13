import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { AdTemplateService } from "@/lib/services/ad-template-service";
import { z } from "zod";

const schema = z.object({
  templateType: z.enum(["PRODUCT_CARD", "FLASH_DEAL", "MYSTERY_BOX", "NEW_ARRIVAL", "DISCOUNT", "SAVEO_PLUS"]),
  productId: z.string().optional(),
  campaignId: z.string().optional(),
  config: z.object({
    productName: z.string().min(1),
    imageUrl: z.string().min(1),
    price: z.string().optional(),
    discountPercent: z.number().optional(),
    timerText: z.string().optional(),
    ctaText: z.string().min(1),
    backgroundColor: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const ad = await AdTemplateService.createAndSave({ ...body, createdByUserId: session.user!.id! });

  return NextResponse.json({ success: true, ad });
}
