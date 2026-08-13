import { NextRequest, NextResponse } from "next/server";
import { requireActiveBrand } from "@/lib/auth";
import { SponsoredSlotService } from "@/lib/services/sponsored-slot-service";
import { BrandBillingService } from "@/lib/services/brand-billing-service";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  placementType: z.enum(["HOMEPAGE_TOP", "SEARCH_TOP", "CATEGORY_TOP", "TRENDING", "RECOMMENDED", "FLASH_SECTION", "DEAL_BOOST"]),
  priority: z.number().int().min(0).default(0),
  budget: z.number().positive(),
  cpc: z.number().positive().optional(),
  cpm: z.number().positive().optional(),
  dailySpendLimit: z.number().positive().optional(),
  startAt: z.string(),
  endAt: z.string(),
});

export async function POST(req: NextRequest) {
  let brand;
  try {
    ({ brand } = await requireActiveBrand());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  // Goes through SponsoredSlotService.create(), which always starts DRAFT — a slot only ever
  // goes ACTIVE via explicit admin approval (SponsoredSlotService.approve), never automatically.
  const slot = await SponsoredSlotService.create({
    brandId: brand.id, // SECURITY (§16) — never taken from the request body
    productId: body.productId,
    placementType: body.placementType,
    priority: body.priority,
    budget: body.budget,
    cpc: body.cpc,
    cpm: body.cpm,
    dailySpendLimit: body.dailySpendLimit,
    startAt: new Date(body.startAt),
    endAt: new Date(body.endAt),
  });

  await BrandBillingService.createInvoice({ brandId: brand.id, type: "SPONSORED_PRODUCT", amount: body.budget });

  return NextResponse.json({ success: true, slot });
}
