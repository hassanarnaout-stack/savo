import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(`${getClientIp(req)}:mobile-products`, RATE_LIMITS.MOBILE_API);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20", 10));
  const categoryId = searchParams.get("categoryId") ?? undefined;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", approvalStatus: "APPROVED", ...(categoryId ? { categoryId } : {}) },
      select: {
        id: true, name: true, nameAr: true, slug: true,
        saveoPrice: true, originalPrice: true, discountPct: true,
        stockQty: true, discoveryScore: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where: { status: "ACTIVE", approvalStatus: "APPROVED", ...(categoryId ? { categoryId } : {}) } }),
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      slug: p.slug,
      price: Number(p.saveoPrice),
      originalPrice: Number(p.originalPrice),
      discountPct: p.discountPct,
      inStock: p.stockQty > 0,
      discoveryScore: p.discoveryScore,
      imageUrl: p.images[0]?.url ?? null,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
