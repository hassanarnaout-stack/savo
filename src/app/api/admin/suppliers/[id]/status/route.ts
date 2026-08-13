import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { NotificationService } from "@/lib/notifications/service";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "REACTIVATE"]),
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
  const { action } = schema.parse(await req.json());

  const data =
    action === "APPROVE"
      ? { status: "ACTIVE" as const, verificationStatus: "VERIFIED" as const }
      : action === "REJECT"
      ? { status: "REJECTED" as const, verificationStatus: "REJECTED" as const }
      : action === "SUSPEND"
      ? { status: "SUSPENDED" as const }
      : { status: "ACTIVE" as const }; // REACTIVATE — verificationStatus stays whatever it already was (VERIFIED)

  const supplier = await prisma.supplier.update({ where: { id }, data });

  if (action === "APPROVE") {
    NotificationService.dispatch({
      type: "SUPPLIER_APPLICATION_APPROVED",
      recipientEmail: supplier.email,
      data: { companyName: supplier.companyName },
    });
  } else if (action === "REJECT") {
    NotificationService.dispatch({
      type: "SUPPLIER_APPLICATION_REJECTED",
      recipientEmail: supplier.email,
      data: { companyName: supplier.companyName },
    });
  } else if (action === "SUSPEND") {
    NotificationService.dispatch({
      type: "SUPPLIER_ACCOUNT_SUSPENDED",
      recipientEmail: supplier.email,
      data: { companyName: supplier.companyName },
    });
  }

  return NextResponse.json({ success: true, supplier });
}
