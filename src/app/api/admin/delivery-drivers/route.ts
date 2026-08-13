import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ partnerId: z.string().min(1), name: z.string().min(2), phone: z.string().min(6) });

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const driver = await prisma.deliveryDriver.create({ data: body });
  return NextResponse.json({ success: true, driver });
}
