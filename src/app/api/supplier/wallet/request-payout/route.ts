import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedSupplier } from "@/lib/auth";
import { SupplierWalletService, InsufficientBalanceError } from "@/lib/services/supplier-wallet-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({ amount: z.number().positive() });

export async function POST(req: NextRequest) {
  let session, supplier;
  try {
    ({ session, supplier } = await requireVerifiedSupplier());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:payout-request`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const { amount } = schema.parse(await req.json());

  try {
    const payout = await SupplierWalletService.requestPayout(supplier.id, amount);
    logger.info("Supplier payout requested", { supplierId: supplier.id, amount, payoutId: payout.id, byUserId: session.user!.id });
    return NextResponse.json({ success: true, payout });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not request payout" }, { status: 500 });
  }
}
