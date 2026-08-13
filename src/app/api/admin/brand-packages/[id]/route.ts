import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  monthlyPrice: z.number().min(0).optional(),
  active: z.boolean().optional(),
  features: z.object({
    maxSponsoredSlots: z.number().int().min(0),
    productExperience: z.boolean(),
    discoveryScoreBoost: z.number().int().min(0).max(50),
    heroDisplay: z.boolean(),
  }).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json());
  const pkg = await prisma.brandPackage.update({ where: { id }, data: body });
  return NextResponse.json({ success: true, package: pkg });
}
