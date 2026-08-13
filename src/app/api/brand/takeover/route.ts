import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveBrand } from "@/lib/auth";
import { BrandBillingService } from "@/lib/services/brand-billing-service";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  banner: z.string().min(1),
  budget: z.number().positive(),
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
  const now = new Date();
  const status = new Date(body.startAt) <= now && new Date(body.endAt) > now ? "LIVE" : "SCHEDULED";

  const takeover = await prisma.brandTakeover.create({
    data: { brandId: brand.id, title: body.title, banner: body.banner, startAt: new Date(body.startAt), endAt: new Date(body.endAt), status },
  });

  await BrandBillingService.createInvoice({ brandId: brand.id, type: "TAKEOVER", amount: body.budget });

  return NextResponse.json({ success: true, takeover });
}
