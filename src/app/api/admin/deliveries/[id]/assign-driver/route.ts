import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ driverId: z.string().min(1), estimatedDeliveryAt: z.string().optional() });

interface Params {
  params: Promise<{ id: string }>; // deliveryId
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json());

  // Real 4-digit OTP, generated once per delivery at driver assignment —
  // shown to the customer in-app, confirmed at handoff.
  const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));

  const [delivery] = await prisma.$transaction([
    prisma.delivery.update({
      where: { id },
      data: {
        driverId: body.driverId,
        estimatedDeliveryAt: body.estimatedDeliveryAt ? new Date(body.estimatedDeliveryAt) : undefined,
        deliveryOtp,
      },
    }),
    prisma.deliveryDriver.update({ where: { id: body.driverId }, data: { status: "ON_DELIVERY" } }),
  ]);

  return NextResponse.json({ success: true, delivery });
}
