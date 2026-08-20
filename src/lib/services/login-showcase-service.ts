import { prisma } from "@/lib/prisma";

const CARD_SELECT = {
  id: true, name: true, nameAr: true, slug: true,
  images: { take: 1, orderBy: { sortOrder: "asc" as const } },
};

/**
 * LoginShowcaseSettings — real, admin-controllable singleton row (same
 * enforced-single-row convention as HomepageSettings/BetaSettings).
 * Admin picks 3 REAL catalog products by id; this service resolves
 * those ids to real product data (name/image) at read time — zero
 * hardcoded product/image anywhere.
 */
export class LoginShowcaseService {
  static async get() {
    const row = await prisma.loginShowcaseSettings.findUnique({ where: { id: "singleton" } });
    return row ?? { id: "singleton", leftProductId: null, centerProductId: null, rightProductId: null, updatedAt: new Date() };
  }

  static async update(params: { leftProductId?: string | null; centerProductId?: string | null; rightProductId?: string | null }) {
    return prisma.loginShowcaseSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...params },
      update: params,
    });
  }

  /**
   * Resolves the 3 configured slots to real product data for display.
   * Fail-safe: a deleted/unapproved/imageless product simply drops out
   * of the result (never a broken image card) — the Login page renders
   * whatever real slots remain, gracefully.
   */
  static async getShowcaseProducts() {
    const settings = await this.get();
    const ids = [settings.leftProductId, settings.centerProductId, settings.rightProductId].filter((id): id is string => !!id);
    if (ids.length === 0) return { left: null, center: null, right: null };

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, status: "ACTIVE", approvalStatus: "APPROVED" },
      select: CARD_SELECT,
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const resolve = (id: string | null) => {
      if (!id) return null;
      const p = byId.get(id);
      if (!p || !p.images[0]?.url) return null; // no broken image cards — drop silently
      return { id: p.id, name: p.name, nameAr: p.nameAr, slug: p.slug, image: p.images[0].url };
    };

    return {
      left: resolve(settings.leftProductId),
      center: resolve(settings.centerProductId),
      right: resolve(settings.rightProductId),
    };
  }
}
