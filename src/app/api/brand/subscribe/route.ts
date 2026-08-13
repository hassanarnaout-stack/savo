import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveBrand } from "@/lib/auth";
import { BrandBillingService } from "@/lib/services/brand-billing-service";
import { z } from "zod";

// Legacy fallback — kept so any pre-Phase-5.7 caller still using the old
// plan-only flow keeps working. New subscriptions should pass packageId
// instead, pulling real admin-editable pricing from BrandPackage.
const LEGACY_PLAN_PRICES: Record<string, number> = { BASIC: 25, PRO: 75, ENTERPRISE: 200 };

const schema = z.union([
  z.object({ packageId: z.string().min(1) }),
  z.object({ plan: z.enum(["BASIC", "PRO", "ENTERPRISE"]) }),
]);

export async function POST(req: NextRequest) {
  let brand;
  try {
    ({ brand } = await requireActiveBrand());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = schema.parse(await req.json());
  const startAt = new Date();
  const endAt = new Date(startAt);
  endAt.setMonth(endAt.getMonth() + 1);

  let subscription;

  if ("packageId" in body) {
    const pkg = await prisma.brandPackage.findUnique({ where: { id: body.packageId } });
    if (!pkg || !pkg.active) {
      return NextResponse.json({ error: "This package isn't available." }, { status: 404 });
    }

    // Map the package type onto the legacy `plan` enum so existing
    // BrandSubscriptionStatus-based code paths keep working unmodified.
    const planMap: Record<string, "BASIC" | "PRO" | "ENTERPRISE"> = {
      STANDARD: "BASIC",
      PREMIUM: "PRO",
      SPOTLIGHT: "PRO",
      ENTERPRISE: "ENTERPRISE",
    };

    subscription = await prisma.brandSubscription.create({
      data: {
        brandId: brand.id,
        packageId: pkg.id,
        plan: planMap[pkg.type],
        price: pkg.monthlyPrice,
        startAt,
        endAt,
        status: "ACTIVE",
      },
    });

    // Premium Product Experience Integration (Phase 5.7 §9) — a package
    // with productExperience unlocked auto-approves this brand's already
    // sponsored products' experience content, and applies the package's
    // discovery score boost. Never touches products belonging to other
    // brands — scoped strictly to this brand's own SponsoredSlot rows.
    const features = pkg.features as any;
    if (features?.productExperience) {
      const slots = await prisma.sponsoredSlot.findMany({ where: { brandId: brand.id }, select: { productId: true } });
      const productIds = slots.map((s) => s.productId);
      if (productIds.length > 0) {
        await prisma.product.updateMany({
          where: { id: { in: productIds } },
          data: { experienceApproved: true, ...(features.heroDisplay ? { experienceType: "PREMIUM" } : {}) },
        });
        if (typeof features.discoveryScoreBoost === "number" && features.discoveryScoreBoost > 0) {
          for (const productId of productIds) {
            const product = await prisma.product.findUnique({ where: { id: productId }, select: { discoveryScore: true } });
            const boosted = Math.min(100, (product?.discoveryScore ?? 0) + features.discoveryScoreBoost);
            await prisma.product.update({ where: { id: productId }, data: { discoveryScore: boosted } });
          }
        }
      }
    }

    await BrandBillingService.createInvoice({ brandId: brand.id, type: "SUBSCRIPTION", amount: Number(pkg.monthlyPrice) });
  } else {
    const price = LEGACY_PLAN_PRICES[body.plan];
    subscription = await prisma.brandSubscription.create({
      data: { brandId: brand.id, plan: body.plan, price, startAt, endAt, status: "ACTIVE" },
    });
    await BrandBillingService.createInvoice({ brandId: brand.id, type: "SUBSCRIPTION", amount: price });
  }

  return NextResponse.json({ success: true, subscription });
}
