import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AuctionService, InvalidBidError } from "@/lib/services/auction-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ amount: z.number().positive() });

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:bid`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many bids. Please wait a moment." }, { status: 429 });
  }

  const { id } = await params;
  const { amount } = schema.parse(await req.json());

  try {
    const bid = await AuctionService.placeBid(id, session.user.id, amount);
    return NextResponse.json({ success: true, bid });
  } catch (err) {
    if (err instanceof InvalidBidError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not place bid" }, { status: 500 });
  }
}
