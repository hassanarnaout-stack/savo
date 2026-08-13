import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MessagingService } from "@/lib/services/messaging-service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const sendSchema = z.object({
  content: z.string().min(1).max(2000),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.enum(["IMAGE", "DOCUMENT"]).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

function isAdmin(role?: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const thread = await MessagingService.getThread(id);
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

  const isOwner = thread.participantUserId === session.user.id;
  if (!isOwner && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "You don't have access to this conversation." }, { status: 403 });
  }

  await MessagingService.markThreadRead(id, session.user.id);
  return NextResponse.json({ thread });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const rateLimit = checkRateLimit(`${getClientIp(req)}:message-send`, RATE_LIMITS.MOBILE_API);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { id } = await params;
  const thread = await MessagingService.getThread(id);
  if (!thread) return NextResponse.json({ error: "Thread not found." }, { status: 404 });

  const isOwner = thread.participantUserId === session.user.id;
  if (!isOwner && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "You don't have access to this conversation." }, { status: 403 });
  }
  if (thread.status === "CLOSED" && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "This conversation is closed." }, { status: 400 });
  }

  const body = sendSchema.parse(await req.json());
  const message = await MessagingService.sendMessage(id, session.user.id, body.content, body.attachmentUrl, body.attachmentType);
  return NextResponse.json({ success: true, message });
}
