import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  customerDescription: z.string().max(500).optional(),
  customerDescriptionAr: z.string().max(500).optional(),
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

  const campaign = await prisma.campaign.update({
    where: { id },
    data: { customerDescription: body.customerDescription || null, customerDescriptionAr: body.customerDescriptionAr || null },
  });

  return NextResponse.json({ success: true, campaign });
}
