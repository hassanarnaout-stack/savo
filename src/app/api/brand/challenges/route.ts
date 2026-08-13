import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveBrand } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  rules: z.object({ requiredProductCount: z.number().int().positive().optional(), categoryId: z.string().optional(), minSpend: z.number().optional() }),
  reward: z.string().min(1),
  startAt: z.string(),
  endAt: z.string(),
});

export async function POST(req: NextRequest) {
  let brand;
  try {
    ({ brand } = await requireActiveBrand());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const challenge = await prisma.brandChallenge.create({
    data: { brandId: brand.id, title: body.title, rules: body.rules, reward: body.reward, startAt: new Date(body.startAt), endAt: new Date(body.endAt) },
  });

  return NextResponse.json({ success: true, challenge });
}
