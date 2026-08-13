import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { SupplierWalletService } from "@/lib/services/supplier-wallet-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({ action: z.enum(["APPROVE", "REJECT"]), referenceNumber: z.string().optional() });

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
      const referenceNumber = body.referenceNumber ?? `PMT-${Date.now().toString(36).toUpperCase()}`;
      const payout = await SupplierWalletService.approvePayout(id, referenceNumber, session.user!.id!);
      logger.info("Supplier payout approved", { payoutId: id, referenceNumber, byUserId: session.user!.id });
      return NextResponse.json({ success: true, payout });
    } else {
      await SupplierWalletService.rejectPayout(id);
      logger.info("Supplier payout rejected", { payoutId: id, byUserId: session.user!.id });
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not process payout" }, { status: 400 });
  }
}
