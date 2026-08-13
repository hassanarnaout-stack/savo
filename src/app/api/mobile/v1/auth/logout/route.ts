import { NextRequest, NextResponse } from "next/server";
import { MobileAuthService } from "@/lib/services/mobile-auth-service";
import { z } from "zod";

const schema = z.object({ refreshToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { refreshToken } = schema.parse(await req.json());
  await MobileAuthService.revokeRefreshToken(refreshToken);
  return NextResponse.json({ success: true });
}
