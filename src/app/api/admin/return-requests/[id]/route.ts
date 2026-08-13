import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { RefundEngine } from "@/lib/services/refund-engine";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({ action: z.enum(["APPROVE", "REJECT"]), adminNotes: z.string().optional() });

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

  try {
    if (body.action === "APPROVE") {
      const result = await RefundEngine.approveAndProcess(id, session.user!.id!);
      logger.info("Return request approved and processed", { returnRequestId: id, byUserId: session.user!.id });
      return NextResponse.json({ success: true, returnRequest: result });
    } else {
      const result = await RefundEngine.reject(id, body.adminNotes);
      logger.info("Return request rejected", { returnRequestId: id, byUserId: session.user!.id });
      return NextResponse.json({ success: true, returnRequest: result });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not process return request" }, { status: 400 });
  }
}
