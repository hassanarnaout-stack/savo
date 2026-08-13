import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids");
  if (!idsParam) return NextResponse.json({ products: [] });

  const ids = idsParam.split(",").filter(Boolean).slice(0, 20); // sane cap
  if (ids.length === 0) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      nameAr: true,
      slug: true,
      originalPrice: true,
      saveoPrice: true,
      stockQty: true,
      type: true,
      dealEndsAt: true,
      images: { take: 1, orderBy: { sortOrder: "asc" } },
    },
  });

  // Preserve the caller's order (most-recently-viewed first) — findMany
  // with `in` does not guarantee input order.
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  return NextResponse.json({
    products: ordered.map((p) => ({
      ...p,
      originalPrice: Number(p!.originalPrice),
      saveoPrice: Number(p!.saveoPrice),
      dealEndsAt: p!.dealEndsAt?.toISOString() ?? null,
    })),
  });
}
