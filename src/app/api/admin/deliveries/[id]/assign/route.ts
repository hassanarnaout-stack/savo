import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ partnerId: z.string().min(1) });

interface Params {
  params: Promise<{ id: string }>; // supplierOrderId
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: supplierOrderId } = await params;
  const { partnerId } = schema.parse(await req.json());

  const delivery = await prisma.delivery.upsert({
    where: { supplierOrderId },
    update: { partnerId, assignedAt: new Date() },
    create: { supplierOrderId, partnerId, assignedAt: new Date(), status: "READY_FOR_PICKUP" },
  });

  return NextResponse.json({ success: true, delivery });
}
