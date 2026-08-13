import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Deep Link Resolver (Phase 7.6)
 *
 * URL scheme convention: saveo://open?path=<path>, or a universal
 * link https://saveo.com.kw/app/<path> that the native app intercepts.
 * Either way, the app calls this endpoint with the path and gets back
 * structured data telling it exactly which screen to open.
 *
 * Supported path patterns:
 *   product/<slug>       → product detail screen
 *   category/<slug>      → category listing screen
 *   order/<id>           → order detail screen (requires auth)
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const segments = path.split("/").filter(Boolean);
  const [type, identifier] = segments;

  if (type === "product" && identifier) {
    const product = await prisma.product.findUnique({ where: { slug: identifier }, select: { id: true, slug: true, name: true } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ screen: "PRODUCT_DETAIL", params: { productId: product.id, slug: product.slug } });
  }

  if (type === "category" && identifier) {
    const category = await prisma.category.findUnique({ where: { slug: identifier }, select: { id: true, slug: true } });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json({ screen: "CATEGORY_LISTING", params: { categoryId: category.id, slug: category.slug } });
  }

  if (type === "order" && identifier) {
    return NextResponse.json({ screen: "ORDER_DETAIL", params: { orderId: identifier } });
  }

  return NextResponse.json({ error: "Unrecognized deep link path" }, { status: 404 });
}
