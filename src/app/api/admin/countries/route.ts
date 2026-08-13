import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  code: z.string().length(2),
  name: z.string().min(2),
  currencyCode: z.string().length(3),
  currencySymbol: z.string().min(1).max(5),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const country = await prisma.country.create({ data: { ...body, code: body.code.toUpperCase(), isActive: false } });
  return NextResponse.json({ success: true, country });
}
