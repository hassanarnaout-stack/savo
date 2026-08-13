import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ReviewService } from "@/lib/services/review-service";
import { z } from "zod";

const schema = z.object({ status: z.enum(["APPROVED", "REJECTED"]), note: z.string().optional() });

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
  const { status, note } = schema.parse(await req.json());
  const review = await ReviewService.moderate(id, status, note);

  return NextResponse.json({ success: true, review });
}
