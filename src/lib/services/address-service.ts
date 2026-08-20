import { prisma } from "@/lib/prisma";

export class AddressNotFoundError extends Error {
  constructor() {
    super("Address not found");
    this.name = "AddressNotFoundError";
  }
}

export interface AddressInput {
  label?: string | null;
  fullName: string;
  phone: string;
  governorate: string;
  area: string;
  block?: string | null;
  street?: string | null;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  avenue?: string | null;
  notes?: string | null;
}

/**
 * AddressService — the real, server-authoritative address management
 * layer that was completely missing before this task (confirmed by
 * the prior read-only audit: zero customer address API existed, and
 * zero code anywhere ever set isDefault=true). Reuses the existing
 * Address model as-is — zero schema change.
 *
 * Enforces one real invariant everywhere an address is created,
 * updated as default, or deleted:
 *   a customer has either ZERO addresses, or EXACTLY ONE default.
 * This is what Subscribe & Save's processOne() depends on
 * (prisma.address.findFirst({ where: { userId, isDefault: true } })).
 */
export class AddressService {
  static async list(userId: string) {
    return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  }

  /** Ownership-checked fetch — returns null (never throws) if missing or not owned, so callers can 404 uniformly. */
  static async getOwned(userId: string, addressId: string) {
    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (!address || address.userId !== userId) return null;
    return address;
  }

  /**
   * Create — first address for a customer automatically becomes the
   * default (this is also what checkout's minimal fix reuses).
   * Every subsequent address defaults to false unless explicitly
   * requested via makeDefault, in which case it's done transactionally
   * (see setDefault).
   */
  static async create(userId: string, input: AddressInput, makeDefault = false) {
    const existingCount = await prisma.address.count({ where: { userId } });
    const shouldBeDefault = existingCount === 0 || makeDefault;

    if (shouldBeDefault && existingCount > 0) {
      return prisma.$transaction(async (tx) => {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
        return tx.address.create({ data: { userId, ...input, isDefault: true } });
      });
    }

    return prisma.address.create({ data: { userId, ...input, isDefault: shouldBeDefault } });
  }

  static async update(userId: string, addressId: string, input: Partial<AddressInput>) {
    const owned = await this.getOwned(userId, addressId);
    if (!owned) throw new AddressNotFoundError();
    return prisma.address.update({ where: { id: addressId }, data: input });
  }

  /** Transactional — clears every other address's default flag before setting this one, guaranteeing exactly one default. */
  static async setDefault(userId: string, addressId: string) {
    const owned = await this.getOwned(userId, addressId);
    if (!owned) throw new AddressNotFoundError();
    return prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
    });
  }

  /**
   * Delete — if the deleted address was the default and others remain,
   * deterministically promotes the most recently created remaining
   * address to default, so Subscribe & Save never silently loses its
   * default address.
   */
  static async delete(userId: string, addressId: string) {
    const owned = await this.getOwned(userId, addressId);
    if (!owned) throw new AddressNotFoundError();

    return prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });
      if (!owned.isDefault) return;

      const nextDefault = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
      if (nextDefault) await tx.address.update({ where: { id: nextDefault.id }, data: { isDefault: true } });
    });
  }
}
