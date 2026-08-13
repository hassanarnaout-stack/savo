import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const body = await req.json();
  const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
  if (productIds.length === 0) {
    return NextResponse.json({ boxes: [] });
  }

  const boxes = await prisma.product.findMany({
    where: { id: { in: productIds }, type: "MYSTERY_BOX", mysteryBoxChooseCount: { gt: 0 } },
    select: {
      id: true,
      name: true,
      nameAr: true,
      mysteryBoxChooseCount: true,
      mysteryBoxContents: {
        where: { poolType: "CHOICE" },
        select: {
          possibleProduct: { select: { id: true, name: true, nameAr: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } },
        },
      },
    },
  });

  return NextResponse.json({
    boxes: boxes.map((b) => ({
      productId: b.id,
      name: b.name,
      nameAr: b.nameAr,
      chooseCount: b.mysteryBoxChooseCount,
      options: b.mysteryBoxContents.map((c) => c.possibleProduct),
    })),
  });
}
