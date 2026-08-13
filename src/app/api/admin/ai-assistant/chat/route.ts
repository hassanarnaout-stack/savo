import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { AICommerceAssistantService } from "@/lib/services/ai-commerce-assistant-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ question: z.string().min(2).max(500) });

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rateLimit = checkRateLimit(`${getClientIp(req)}:ai-assistant`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const { question } = schema.parse(await req.json());
  const result = await AICommerceAssistantService.ask(question);
  return NextResponse.json(result);
}
