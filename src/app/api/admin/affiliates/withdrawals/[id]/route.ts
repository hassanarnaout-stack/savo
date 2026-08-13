import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { AffiliateService } from "@/lib/services/affiliate-service";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  referenceNumber: z.string().optional(),
  reason: z.string().optional(),
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

  if (body.action === "APPROVE") {
    const referenceNumber = body.referenceNumber ?? `AFF-${Date.now().toString(36).toUpperCase()}`;
    await AffiliateService.payWithdrawal(id, referenceNumber);
  } else {
    await AffiliateService.rejectWithdrawal(id, body.reason ?? "Rejected by admin");
  }

  return NextResponse.json({ success: true });
}
