import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MessagingService } from "@/lib/services/messaging-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ subject: z.string().min(1).max(150), message: z.string().min(1).max(2000) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const rateLimit = checkRateLimit(`${getClientIp(req)}:message-thread-create`, RATE_LIMITS.SENSITIVE_POST);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { subject, message } = schema.parse(await req.json());
  const participantType = session.user.role === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER";

  const thread = await MessagingService.createThread(session.user.id, participantType, subject, message);
  return NextResponse.json({ success: true, thread });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const threads = await MessagingService.getThreadsForUser(session.user.id);
  return NextResponse.json({ threads });
}
