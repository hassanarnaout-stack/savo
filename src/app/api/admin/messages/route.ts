import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { MessagingService } from "@/lib/services/messaging-service";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const threads = await MessagingService.getAllThreadsForAdmin(status === "OPEN" || status === "CLOSED" ? status : undefined);
  return NextResponse.json({ threads });
}
