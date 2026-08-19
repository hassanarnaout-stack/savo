import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  planId: z.string(),
  key: z.enum(["EXTRA_DISCOUNT", "EARLY_ACCESS", "EXCLUSIVE_DEALS", "FREE_DELIVERY", "PLUS_BADGE", "MYSTERY_BOX_BONUS", "DOUBLE_REWARD_POINTS"]),
  label: z.string().nullable().optional(),
  labelAr: z.string().nullable().optional(),
  value: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = createSchema.parse(await req.json());

  try {
    const benefit = await prisma.membershipPlanBenefit.create({ data: body });
    return NextResponse.json({ success: true, benefit });
  } catch (err: any) {
    // @@unique([planId, key]) — this plan already has this benefit key.
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "This plan already has that benefit." }, { status: 409 });
    }
    throw err;
  }
}
