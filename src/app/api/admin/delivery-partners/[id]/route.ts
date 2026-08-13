import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ status: z.enum(["ACTIVE", "INACTIVE"]) });

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
  const { status } = schema.parse(await req.json());
  const partner = await prisma.deliveryPartner.update({ where: { id }, data: { status } });
  return NextResponse.json({ success: true, partner });
}
