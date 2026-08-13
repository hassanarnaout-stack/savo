import { NextRequest, NextResponse } from "next/server";
import { AffiliateService } from "@/lib/services/affiliate-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ code: z.string().min(1).max(20), landingPath: z.string(), referrerUrl: z.string().optional() });
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30-day attribution window, standard affiliate convention

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`${getClientIp(req)}:affiliate-click`, RATE_LIMITS.MOBILE_API);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { code, landingPath, referrerUrl } = schema.parse(await req.json());
  const affiliateId = await AffiliateService.recordClick(code, landingPath, referrerUrl);
  if (!affiliateId) return NextResponse.json({ tracked: false });

  const res = NextResponse.json({ tracked: true });
  res.cookies.set("savo_ref", code.toUpperCase(), { maxAge: COOKIE_MAX_AGE_SECONDS, path: "/", sameSite: "lax" });
  return res;
}
