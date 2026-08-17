import { prisma } from "@/lib/prisma";

const MIN_COUNT = 1;
const MAX_COUNT = 8; // Discovery Display thumbnails stay usable up to this many

/**
 * HomepageSettings — real, admin-controllable singleton row (same
 * enforced-single-row convention as BetaSettings). Currently one
 * field: how many real products rotate in the Hero Discovery Display.
 */
export class HomepageSettingsService {
  static async get() {
    const row = await prisma.homepageSettings.findUnique({ where: { id: "singleton" } });
    return row ?? { id: "singleton", heroProductCount: 5, updatedAt: new Date() };
  }

  static async updateHeroProductCount(count: number) {
    const clamped = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(count)));
    return prisma.homepageSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", heroProductCount: clamped },
      update: { heroProductCount: clamped },
    });
  }
}
