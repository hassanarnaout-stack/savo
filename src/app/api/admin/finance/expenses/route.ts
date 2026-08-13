import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  category: z.enum(["MARKETING", "OPERATIONS", "SALARIES", "TECHNOLOGY", "LOGISTICS", "OTHER"]),
  amount: z.number().positive(),
  date: z.string(),
  notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());

  const expense = await prisma.expense.create({
    data: { category: body.category, amount: body.amount, date: new Date(body.date), notes: body.notes },
  });

  return NextResponse.json({ success: true, expense });
}
