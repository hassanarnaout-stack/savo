import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addSchema = z.object({
  possibleProductId: z.string().min(1),
  probability: z.number().min(0.01).max(100),
  isSpecialItem: z.boolean().optional(),
  poolType: z.enum(["LOCKED", "CHOICE"]).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const contents = await prisma.mysteryBoxContent.findMany({
    where: { mysteryBoxId: id },
    include: { possibleProduct: { select: { id: true, name: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
    orderBy: { probability: "desc" },
  });

  const totalProbability = contents.reduce((sum, c) => sum + Number(c.probability), 0);

  return NextResponse.json({ contents, totalProbability });
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  let body;
  try {
    body = addSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input — check the product ID and % chance are filled in correctly." }, { status: 400 });
  }

  if (body.possibleProductId === id) {
    return NextResponse.json({ error: "A mystery box can't contain itself." }, { status: 400 });
  }

  const productExists = await prisma.product.findUnique({ where: { id: body.possibleProductId }, select: { id: true } });
  if (!productExists) {
    return NextResponse.json({ error: "No product found with that ID — double-check you copied it correctly from /admin/products." }, { status: 400 });
  }

  try {
    const content = await prisma.mysteryBoxContent.create({
      data: {
        mysteryBoxId: id,
        possibleProductId: body.possibleProductId,
        probability: body.probability,
        isSpecialItem: body.isSpecialItem ?? false,
        poolType: body.poolType ?? "LOCKED",
      },
    });
    return NextResponse.json({ success: true, content });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "That product is already in this box's pool." }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not add product to pool." }, { status: 500 });
  }
}
