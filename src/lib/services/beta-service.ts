import { prisma } from "@/lib/prisma";
import type { BetaInviteType } from "@prisma/client";

/**
 * BetaService — Phase 5
 *
 * DB-backed (not env-var-backed) so beta mode can be toggled from the
 * admin UI without a redeploy. The single settings row is enforced by
 * always upserting the fixed id "singleton" — there is intentionally no
 * way to create a second row through this service.
 */

const SETTINGS_ID = "singleton";

export class BetaService {
  static async getSettings() {
    const settings = await prisma.betaSettings.findUnique({ where: { id: SETTINGS_ID } });
    // Self-healing default: if no row exists yet (fresh DB), beta mode is
    // OFF by default — the platform behaves exactly as it did before this
    // phase until an admin deliberately turns it on.
    return settings ?? { id: SETTINGS_ID, enabled: false, inviteOnly: false, startDate: null, endDate: null, updatedAt: new Date() };
  }

  static async updateSettings(params: { enabled?: boolean; inviteOnly?: boolean; startDate?: Date | null; endDate?: Date | null }) {
    return prisma.betaSettings.upsert({
      where: { id: SETTINGS_ID },
      update: params,
      create: {
        id: SETTINGS_ID,
        enabled: params.enabled ?? false,
        inviteOnly: params.inviteOnly ?? false,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    });
  }

  /**
   * Called from registration endpoints. Returns true if this email is
   * allowed to register right now, given current beta settings.
   *   - Beta mode off entirely -> always allowed (normal operation).
   *   - Beta mode on, invite-only off -> anyone can register (open beta).
   *   - Beta mode on, invite-only on -> must be on the BetaInvite list.
   */
  static async canRegister(email: string, type: BetaInviteType): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.inviteOnly) return true;

    const invite = await prisma.betaInvite.findUnique({ where: { email: email.toLowerCase() } });
    return !!invite && invite.type === type;
  }

  /** Marks an invite as consumed once the invited person actually registers. */
  static async markInviteRegistered(email: string) {
    await prisma.betaInvite.updateMany({
      where: { email: email.toLowerCase(), status: "INVITED" },
      data: { status: "REGISTERED", registeredAt: new Date() },
    });
  }

  static async addInvite(email: string, type: BetaInviteType, notes?: string) {
    return prisma.betaInvite.upsert({
      where: { email: email.toLowerCase() },
      update: { type, notes },
      create: { email: email.toLowerCase(), type, notes },
    });
  }

  static async removeInvite(email: string) {
    await prisma.betaInvite.deleteMany({ where: { email: email.toLowerCase() } });
  }

  static async listInvites(type?: BetaInviteType) {
    return prisma.betaInvite.findMany({
      where: type ? { type } : {},
      orderBy: { invitedAt: "desc" },
    });
  }
}
