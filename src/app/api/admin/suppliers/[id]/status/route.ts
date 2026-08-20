import { NextRequest, NextResponse, unstable_after as after } from "next/server";
// unstable_after (aliased to `after`) — the installed Next.js version is
// 15.0.0; the stable `after` export only landed in 15.1. Same function,
// same guarantee (background work gets a real chance to finish instead
// of a bare unawaited call that can be cut off in a serverless runtime)
// — just the pre-stabilization name for this Next.js version.
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

  // Notification dispatch runs via Next.js's after() — the official
  // pattern for background work that must not block the response but
  // also must not risk being cut off mid-flight the way a bare
  // fire-and-forget call can be in a serverless runtime. Supplier
  // status approval itself never depends on email success.
  if (action === "APPROVE") {
    after(() =>
      NotificationService.dispatch({
        type: "SUPPLIER_APPLICATION_APPROVED",
        recipientEmail: supplier.email,
        data: { companyName: supplier.companyName },
      })
    );
  } else if (action === "REJECT") {
    after(() =>
      NotificationService.dispatch({
        type: "SUPPLIER_APPLICATION_REJECTED",
        recipientEmail: supplier.email,
        data: { companyName: supplier.companyName },
      })
    );
  } else if (action === "SUSPEND") {
    after(() =>
      NotificationService.dispatch({
        type: "SUPPLIER_ACCOUNT_SUSPENDED",
        recipientEmail: supplier.email,
        data: { companyName: supplier.companyName },
      })
    );
  }

  return NextResponse.json({ success: true, supplier });
}
