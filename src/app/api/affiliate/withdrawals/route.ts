import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AffiliateService } from "@/lib/services/affiliate-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ amount: z.number().positive() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const rateLimit = checkRateLimit(`${getClientIp(req)}:affiliate-withdrawal`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const account = await prisma.affiliateAccount.findUnique({ where: { userId: session.user.id } });
  if (!account) return NextResponse.json({ error: "No affiliate account." }, { status: 404 });

  const { amount } = schema.parse(await req.json());

  try {
    const withdrawal = await AffiliateService.requestWithdrawal(account.id, amount);
    return NextResponse.json({ success: true, withdrawal });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Could not request withdrawal" }, { status: 400 });
  }
}
