import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  isEnabled: z.boolean().optional(),
  value: z.number().nullable().optional(),
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

  const benefit = await prisma.membershipPlanBenefit.update({
    where: { id },
    data: body,
  });

  return NextResponse.json({ success: true, benefit });
}
