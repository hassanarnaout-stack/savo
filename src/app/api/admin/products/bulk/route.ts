import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  productIds: z.array(z.string()).min(1),
  action: z.enum(["ACTIVATE", "DEACTIVATE", "SET_CATEGORY"]),
  categoryId: z.string().optional(), // required for SET_CATEGORY
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  let data: any;
  if (body.action === "ACTIVATE") data = { status: "ACTIVE" };
  else if (body.action === "DEACTIVATE") data = { status: "DRAFT" };
  else {
    if (!body.categoryId) return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    data = { categoryId: body.categoryId };
  }

  const result = await prisma.product.updateMany({ where: { id: { in: body.productIds } }, data });
  return NextResponse.json({ success: true, count: result.count });
}
