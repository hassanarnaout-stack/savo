import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      userId: true,
      supplierOrders: {
        select: {
          id: true,
          status: true,
          delivery: {
            select: {
              status: true,
              estimatedDeliveryAt: true,
              pickedAt: true,
              deliveredAt: true,
              deliveryOtp: true,
              deliveryProofUrl: true,
              driver: { select: { name: true, phone: true, currentLat: true, currentLng: true, lastPingAt: true } },
            },
          },
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.userId !== session.user.id) return NextResponse.json({ error: "This isn't your order." }, { status: 403 });

  return NextResponse.json({
    deliveries: order.supplierOrders.map((so) => ({ supplierOrderId: so.id, orderStatus: so.status, delivery: so.delivery })),
  });
}
