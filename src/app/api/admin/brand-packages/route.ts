import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["STANDARD", "PREMIUM", "SPOTLIGHT", "ENTERPRISE"]),
  monthlyPrice: z.number().min(0),
  description: z.string().optional(),
  features: z.object({
    maxSponsoredSlots: z.number().int().min(0),
    productExperience: z.boolean(),
    discoveryScoreBoost: z.number().int().min(0).max(50),
    heroDisplay: z.boolean(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const pkg = await prisma.brandPackage.create({ data: body });
  return NextResponse.json({ success: true, package: pkg });
}
