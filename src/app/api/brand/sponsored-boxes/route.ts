import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveBrand } from "@/lib/auth";
import { BrandBillingService } from "@/lib/services/brand-billing-service";
import { z } from "zod";

const schema = z.object({
  mysteryBoxId: z.string().min(1),
  sponsorshipFee: z.number().positive(),
  productsIncluded: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  let brand;
  try {
    ({ brand } = await requireActiveBrand());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const mysteryBox = await prisma.product.findUnique({ where: { id: body.mysteryBoxId }, select: { type: true } });
  if (!mysteryBox || mysteryBox.type !== "MYSTERY_BOX") {
    return NextResponse.json({ error: "Not a valid mystery box product" }, { status: 400 });
  }

  const sponsoredBox = await prisma.brandSponsoredBox.create({
    data: { brandId: brand.id, mysteryBoxId: body.mysteryBoxId, sponsorshipFee: body.sponsorshipFee, productsIncluded: body.productsIncluded },
  });

  await BrandBillingService.createInvoice({ brandId: brand.id, type: "MYSTERY_BOX_SPONSOR", amount: body.sponsorshipFee });

  return NextResponse.json({ success: true, sponsoredBox });
}
