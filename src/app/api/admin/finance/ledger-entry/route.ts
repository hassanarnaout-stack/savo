import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { SupplierLedgerService } from "@/lib/services/supplier-ledger-service";
import { z } from "zod";

const schema = z.object({
  supplierId: z.string().min(1),
  type: z.enum(["REFUND", "ADJUSTMENT", "PAYOUT"]),
  amount: z.number(), // caller supplies the correctly-signed value — REFUND/PAYOUT are conventionally negative
  description: z.string().min(3).max(300),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const entry = await SupplierLedgerService.recordManualEntry({
    supplierId: body.supplierId,
    type: body.type,
    amount: body.amount,
    description: body.description,
    createdByUserId: session.user!.id!,
  });

  return NextResponse.json({ success: true, entry });
}
