import { prisma } from "@/lib/prisma";

/**
 * Catalog Brand — merchandising/catalog entity for products.
 * ============================================================
 * COMPLETELY SEPARATE from BrandAccount (commercial/paid marketing
 * partner — see brand-account-service equivalents). Zero automatic
 * relation between the two: never matched by name, never sharing a
 * slug, never sharing a management screen. This file only ever
 * touches the `Brand`/`Product.brandId`/`Product.brandName` trio.
 */
export class BrandService {
  static async listActive() {
    return prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where: { status: "ACTIVE", approvalStatus: "APPROVED" } } } } },
    });
  }

  static async getBySlug(slug: string) {
    return prisma.brand.findUnique({ where: { slug } });
  }

  static async getById(id: string) {
    return prisma.brand.findUnique({ where: { id } });
  }

  /** Real, deterministic slugification — same convention as the
   * existing brandNameToSlug() helper used by legacy brandName-based
   * routing, so a Catalog Brand named the same as an existing legacy
   * brandName group naturally resolves to the same URL. */
  static slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  static async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = this.slugify(name) || "brand";
    let slug = base;
    let suffix = 1;
    while (true) {
      const existing = await prisma.brand.findUnique({ where: { slug }, select: { id: true } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${suffix++}`;
    }
  }

  static async create(data: { name: string; nameAr?: string | null; logoUrl?: string | null; coverImageUrl?: string | null; description?: string | null; descriptionAr?: string | null; isFeatured?: boolean; sortOrder?: number }) {
    const slug = await this.generateUniqueSlug(data.name);
    return prisma.brand.create({ data: { ...data, slug } });
  }

  static async update(id: string, data: Partial<{ name: string; nameAr: string | null; logoUrl: string | null; coverImageUrl: string | null; description: string | null; descriptionAr: string | null; isActive: boolean; isFeatured: boolean; sortOrder: number }>) {
    return prisma.brand.update({ where: { id }, data });
  }

  /**
   * Backfill — one-time migration from the existing Product.brandName
   * values to real Brand records. `dryRun: true` (default) NEVER
   * writes anything; it only reports what WOULD happen, matching the
   * explicit safety requirement. brandName itself is NEVER mutated —
   * only the new, additive Product.brandId gets assigned.
   *
   * Normalization for GROUPING/DEDUPLICATION only ("Lindt" / " lindt "
   * / "LINDT" collapse into one Brand) — the first-seen ORIGINAL
   * casing becomes the real Brand.name (never invented, never
   * reformatted beyond a trim).
   */
  static async backfillFromBrandName(dryRun = true) {
    const products = await prisma.product.findMany({
      select: { id: true, brandName: true },
    });

    const totalScanned = products.length;
    const withoutBrand = products.filter((p) => !p.brandName?.trim()).length;

    const groups = new Map<string, { originalName: string; productIds: string[] }>();
    for (const p of products) {
      const raw = p.brandName?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const existing = groups.get(key);
      if (existing) existing.productIds.push(p.id);
      else groups.set(key, { originalName: raw, productIds: [p.id] });
    }

    const existingBrands = await prisma.brand.findMany({ select: { id: true, name: true, slug: true } });
    const existingByLowerName = new Map(existingBrands.map((b) => [b.name.toLowerCase(), b]));

    const proposals: { normalizedKey: string; brandName: string; productCount: number; existingBrandId: string | null; proposedSlug: string | null }[] = [];
    for (const [key, group] of groups) {
      const existing = existingByLowerName.get(key);
      proposals.push({
        normalizedKey: key,
        brandName: group.originalName,
        productCount: group.productIds.length,
        existingBrandId: existing?.id ?? null,
        proposedSlug: existing ? null : await this.generateUniqueSlug(group.originalName),
      });
    }

    if (dryRun) {
      return {
        dryRun: true as const,
        totalScanned,
        withoutBrand,
        distinctBrandNames: groups.size,
        newBrandsToCreate: proposals.filter((p) => !p.existingBrandId).length,
        alreadyExisting: proposals.filter((p) => p.existingBrandId).length,
        proposals,
      };
    }

    // Execute — create missing Brand rows, then link products. Each
    // brand+its product links happen in one transaction so a partial
    // failure never leaves a Brand with zero linked products it
    // should have had.
    let brandsCreated = 0;
    let productsLinked = 0;
    const errors: { brandName: string; error: string }[] = [];

    for (const [key, group] of groups) {
      try {
        await prisma.$transaction(async (tx) => {
          let brand = await tx.brand.findFirst({ where: { name: { equals: group.originalName, mode: "insensitive" } } });
          if (!brand) {
            const slug = await this.generateUniqueSlug(group.originalName);
            brand = await tx.brand.create({ data: { name: group.originalName, slug } });
            brandsCreated++;
          }
          const result = await tx.product.updateMany({
            where: { id: { in: group.productIds }, brandId: null },
            data: { brandId: brand.id },
          });
          productsLinked += result.count;
        });
      } catch (err: any) {
        errors.push({ brandName: group.originalName, error: err?.message ?? "Unknown error" });
      }
    }

    return {
      dryRun: false as const,
      totalScanned,
      withoutBrand,
      distinctBrandNames: groups.size,
      brandsCreated,
      productsLinked,
      errors,
    };
  }

  /** Historical Product.brand (the separate, legacy field — see the
   * Phase 1 import bug fix) rows stranded with no brandName. Reported
   * only, never auto-merged — a real, separate remediation decision. */
  static async findStrandedLegacyBrandRows() {
    const rows = await prisma.product.findMany({
      where: { brand: { not: null }, OR: [{ brandName: null }, { brandName: "" }] },
      select: { id: true, name: true, brand: true },
      take: 50,
    });
    const count = await prisma.product.count({
      where: { brand: { not: null }, OR: [{ brandName: null }, { brandName: "" }] },
    });
    return { count, examples: rows };
  }
}
