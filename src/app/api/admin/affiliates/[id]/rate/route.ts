import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ commissionRate: z.number().min(0).max(50) });

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
  const { commissionRate } = schema.parse(await req.json());

  const account = await prisma.affiliateAccount.update({ where: { id }, data: { commissionRate } });
  return NextResponse.json({ success: true, account });
}
