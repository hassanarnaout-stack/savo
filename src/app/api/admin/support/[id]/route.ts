import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["OPEN", "PROCESSING", "RESOLVED"]),
  adminNotes: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>; // issueId
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = schema.parse(await req.json());

  const issue = await prisma.orderIssue.update({
    where: { id },
    data: {
      status: body.status,
      adminNotes: body.adminNotes,
      resolvedAt: body.status === "RESOLVED" ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, issue });
}
