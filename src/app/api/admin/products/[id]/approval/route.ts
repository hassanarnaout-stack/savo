import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json());

  const product = await prisma.product.update({
    where: { id },
    data: {
      approvalStatus: body.action === "APPROVE" ? "APPROVED" : "REJECTED",
      approvedAt: body.action === "APPROVE" ? new Date() : null,
      approvedByUserId: session.user?.id,
      rejectionReason: body.action === "REJECT" ? body.rejectionReason ?? "Did not meet quality guidelines" : null,
    },
  });

  return NextResponse.json({ success: true, product });
}
