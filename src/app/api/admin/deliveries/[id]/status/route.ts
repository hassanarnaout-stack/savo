import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ status: z.enum(["READY_FOR_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"]), otpEntered: z.string().optional(), proofUrl: z.string().url().optional() });

interface Params {
  params: Promise<{ id: string }>; // deliveryId
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { status, otpEntered, proofUrl } = schema.parse(await req.json());

  if (status === "DELIVERED") {
    const current = await prisma.delivery.findUniqueOrThrow({ where: { id } });
    if (current.deliveryOtp && current.deliveryOtp !== otpEntered) {
      return NextResponse.json({ error: "Incorrect delivery code — verify with the customer before marking delivered." }, { status: 400 });
    }
  }

  const delivery = await prisma.delivery.update({
    where: { id },
    data: {
      status,
      pickedAt: status === "PICKED_UP" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
      deliveryProofUrl: status === "DELIVERED" ? proofUrl : undefined,
    },
  });

  return NextResponse.json({ success: true, delivery });
}
