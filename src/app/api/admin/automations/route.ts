import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  trigger: z.enum(["CUSTOMER_INACTIVE", "CART_ABANDONED", "BIRTHDAY", "AFTER_PURCHASE", "PRODUCT_RESTOCK"]),
  action: z.enum(["EMAIL", "PUSH", "DISCOUNT"]),
  conditions: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const automation = await prisma.marketingAutomation.create({ data: body });
  return NextResponse.json({ success: true, automation });
}
