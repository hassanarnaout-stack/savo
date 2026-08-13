import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { MessagingService } from "@/lib/services/messaging-service";
import { z } from "zod";

const schema = z.object({ action: z.enum(["CLOSE", "REOPEN"]) });

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = schema.parse(await req.json());
  const thread = action === "CLOSE" ? await MessagingService.closeThread(id) : await MessagingService.reopenThread(id);

  return NextResponse.json({ success: true, thread });
}
