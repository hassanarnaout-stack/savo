import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/**
 * GiftCardService — Phase 8.2
 *
 * A gift card is a real prepaid balance, not a discount rule — it
 * gets its own redemption flow (GiftCardRedemption) that directly
 * reduces what a customer owes, and supports partial use across
 * multiple orders.
 */
const GIFT_CARD_VALIDITY_DAYS = 365;

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let code = "SVO";
  for (let group = 0; group < 3; group++) {
    code += "-";
    for (let i = 0; i < 4; i++) {
      code += alphabet[bytes[group * 4 + i] % alphabet.length];
    }
  }
  return code;
}

export class GiftCardService {
  static async purchase(params: {
    purchasedByUserId: string;
    amount: number;
    recipientEmail?: string;
    recipientName?: string;
    personalMessage?: string;
  }) {
    if (params.amount < 5 || params.amount > 200) {
      throw new Error("Gift card amount must be between 5 and 200 KD.");
    }

    let code = generateCode();
    while (await prisma.giftCard.findUnique({ where: { code } })) {
      code = generateCode();
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + GIFT_CARD_VALIDITY_DAYS);

    return prisma.giftCard.create({
      data: {
        code,
        initialValue: params.amount,
        remainingBalance: params.amount,
        purchasedByUserId: params.purchasedByUserId,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        personalMessage: params.personalMessage,
        expiresAt,
      },
    });
  }

  /** System-issued reward (e.g. affiliate milestones) — not a customer purchase, so it skips the 5-200 KD purchase limit and has no purchasedByUserId. Reuses the same real GiftCard model and redemption flow. */
  static async issueRewardCard(amount: number, recipientUserId: string, note: string) {
    let code = generateCode();
    while (await prisma.giftCard.findUnique({ where: { code } })) {
      code = generateCode();
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + GIFT_CARD_VALIDITY_DAYS);

    return prisma.giftCard.create({
      data: {
        code,
        initialValue: amount,
        remainingBalance: amount,
        purchasedByUserId: recipientUserId, // the recipient "owns" it for display purposes in their account, even though they didn't buy it
        personalMessage: note,
        expiresAt,
      },
    });
  }

  static async checkBalance(code: string): Promise<{ valid: boolean; balance: number; reason?: string }> {
    const card = await prisma.giftCard.findUnique({ where: { code: code.toUpperCase() } });
    if (!card) return { valid: false, balance: 0, reason: "Gift card not found." };
    if (card.status === "CANCELLED") return { valid: false, balance: 0, reason: "This gift card has been cancelled." };
    if (card.expiresAt < new Date()) return { valid: false, balance: 0, reason: "This gift card has expired." };
    if (Number(card.remainingBalance) <= 0) return { valid: false, balance: 0, reason: "This gift card has no remaining balance." };
    return { valid: true, balance: Number(card.remainingBalance) };
  }

  static async redeemToOrder(code: string, orderId: string, requestedAmount: number): Promise<{ applied: number }> {
    return prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.findUnique({ where: { code: code.toUpperCase() } });
      if (!card) throw new Error("Gift card not found.");
      if (card.status === "CANCELLED") throw new Error("This gift card has been cancelled.");
      if (card.expiresAt < new Date()) throw new Error("This gift card has expired.");

      const available = Number(card.remainingBalance);
      const applied = Math.min(available, requestedAmount);
      if (applied <= 0) throw new Error("This gift card has no remaining balance.");

      const newBalance = available - applied;
      await tx.giftCard.update({
        where: { id: card.id },
        data: { remainingBalance: newBalance, status: newBalance <= 0 ? "REDEEMED" : "ACTIVE" },
      });

      await tx.giftCardRedemption.create({ data: { giftCardId: card.id, orderId, amountUsed: applied } });

      return { applied };
    });
  }
}
