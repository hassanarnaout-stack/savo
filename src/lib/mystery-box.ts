import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Weighted random pick from a box's configured contents. Probabilities
 * don't need to sum to exactly 100 — this normalizes against whatever
 * total is configured, so partially-configured boxes still work
 * sensibly (e.g. three items at 40/30/20 = 90 total still resolves
 * correctly relative to each other).
 */
function weightedPick<T extends { probability: number }>(pool: T[]): T {
  const total = pool.reduce((sum, item) => sum + item.probability, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    if (roll < item.probability) return item;
    roll -= item.probability;
  }
  return pool[pool.length - 1]; // floating-point safety net
}

/**
 * Creates the reveal record at checkout time AND, in the new (2026)
 * architecture, is immediately followed by openMysteryBoxReveal() in
 * the SAME checkout transaction — see src/app/api/checkout/route.ts.
 * The actual hidden LOCKED-pool products are now allocated
 * automatically at this point (real inventory-safe, server-side,
 * reusing the exact same weighted-random draw as before) rather than
 * waiting for a customer-triggered "open" action. The customer is
 * NEVER shown the result — MysteryBoxRevealItem exists purely for
 * admin/fulfillment operational visibility.
 */
export async function createPendingReveal(
  tx: Tx,
  params: { orderItemId: string; userId: string; chosenProductIds?: string[] }
) {
  return tx.mysteryBoxReveal.create({
    data: {
      orderItemId: params.orderItemId,
      userId: params.userId,
      chosenProductIds: params.chosenProductIds && params.chosenProductIds.length > 0 ? params.chosenProductIds : undefined,
    },
  });
}

/**
 * Real, server-side validation of a customer's CHOICE-pool picks —
 * shared by the checkout path (new 2026 flow) and submitChoices()
 * (kept for any pre-2026 pending reveals). Never trusts the client:
 * re-derives the required count and the valid product-ID set from the
 * actual database configuration every time.
 */
export async function validateMysteryBoxChoices(tx: Tx, params: { mysteryBoxId: string; productIds: string[] }) {
  const box = await tx.product.findUniqueOrThrow({
    where: { id: params.mysteryBoxId },
    select: { mysteryBoxChooseCount: true },
  });
  const chooseCount = box.mysteryBoxChooseCount ?? 0;
  if (chooseCount === 0) return; // no CHOICE pool configured — nothing to validate

  if (params.productIds.length !== chooseCount) {
    throw new InvalidChoiceCountError(chooseCount);
  }
  const validOptions = await tx.mysteryBoxContent.findMany({
    where: { mysteryBoxId: params.mysteryBoxId, poolType: "CHOICE" },
    select: { possibleProductId: true },
  });
  const validIds = new Set(validOptions.map((o) => o.possibleProductId));
  if (!params.productIds.every((id) => validIds.has(id))) {
    throw new InvalidChoiceProductError();
  }
}

export class RevealOwnershipError extends Error {
  constructor() {
    super("This mystery box reveal does not belong to the current user");
    this.name = "RevealOwnershipError";
  }
}
export class AlreadyRevealedError extends Error {
  constructor() {
    super("This mystery box has already been opened");
    this.name = "AlreadyRevealedError";
  }
}
export class InvalidChoiceCountError extends Error {
  constructor(expected: number) {
    super(`Please pick exactly ${expected} item${expected === 1 ? "" : "s"}.`);
    this.name = "InvalidChoiceCountError";
  }
}
export class InvalidChoiceProductError extends Error {
  constructor() {
    super("One of the selected items isn't a valid choice for this box.");
    this.name = "InvalidChoiceProductError";
  }
}
export class ChoicesAlreadySubmittedError extends Error {
  constructor() {
    super("You've already made your picks for this box.");
    this.name = "ChoicesAlreadySubmittedError";
  }
}

/**
 * Returns the box's real CHOICE pool for the customer to pick from before
 * the final reveal — actual visible product info (name, image, price),
 * since the customer has to see and choose these, unlike the LOCKED pool
 * which stays hidden until the final reveal. Returns chooseCount = 0 for
 * boxes with no CHOICE pool configured (the old, fully-random behavior).
 */
export async function getChoiceOptions(tx: Tx, params: { revealId: string; userId: string }) {
  const reveal = await tx.mysteryBoxReveal.findUniqueOrThrow({
    where: { id: params.revealId },
    include: { orderItem: true },
  });
  if (reveal.userId !== params.userId) throw new RevealOwnershipError();

  const box = await tx.product.findUniqueOrThrow({
    where: { id: reveal.orderItem.productId },
    select: { mysteryBoxChooseCount: true },
  });
  const chooseCount = box.mysteryBoxChooseCount ?? 0;

  if (chooseCount === 0) {
    return { chooseCount: 0, options: [], alreadyChosen: reveal.chosenProductIds as string[] | null };
  }

  const options = await tx.mysteryBoxContent.findMany({
    where: { mysteryBoxId: reveal.orderItem.productId, poolType: "CHOICE" },
    include: { possibleProduct: { select: { id: true, name: true, nameAr: true, saveoPrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } },
  });

  return { chooseCount, options, alreadyChosen: reveal.chosenProductIds as string[] | null };
}

/** Locks in the customer's real picks — validated server-side against the actual CHOICE pool and count, never trusted blindly from the client. */
export async function submitChoices(tx: Tx, params: { revealId: string; userId: string; productIds: string[] }) {
  const reveal = await tx.mysteryBoxReveal.findUniqueOrThrow({
    where: { id: params.revealId },
    include: { orderItem: true },
  });
  if (reveal.userId !== params.userId) throw new RevealOwnershipError();
  if (reveal.revealedAt) throw new AlreadyRevealedError();
  if (reveal.chosenProductIds) throw new ChoicesAlreadySubmittedError();

  const box = await tx.product.findUniqueOrThrow({
    where: { id: reveal.orderItem.productId },
    select: { mysteryBoxChooseCount: true },
  });
  const chooseCount = box.mysteryBoxChooseCount ?? 0;

  if (params.productIds.length !== chooseCount) {
    throw new InvalidChoiceCountError(chooseCount);
  }

  const validOptions = await tx.mysteryBoxContent.findMany({
    where: { mysteryBoxId: reveal.orderItem.productId, poolType: "CHOICE" },
    select: { possibleProductId: true },
  });
  const validIds = new Set(validOptions.map((o) => o.possibleProductId));
  if (!params.productIds.every((id) => validIds.has(id))) {
    throw new InvalidChoiceProductError();
  }

  await tx.mysteryBoxReveal.update({
    where: { id: params.revealId },
    data: { chosenProductIds: params.productIds },
  });
}

/**
 * The actual hidden-contents allocation. As of the 2026 approved
 * Figma flow, this is called automatically at CHECKOUT time (right
 * after createPendingReveal, same transaction) — never by a
 * customer-triggered "open"/"reveal" action, which the approved design
 * explicitly forbids. `revealedAt` here means "hidden contents have
 * been allocated internally", not "shown to the customer" — the
 * customer-facing serialization must never include MysteryBoxRevealItem
 * data (enforced in the checkout/order-history response shaping, not
 * here — this function's job is purely the real, inventory-aware
 * allocation logic, reused unchanged from the pre-2026 architecture).
 *
 * Picks `quantity` items (independently, with replacement — buying 2 of
 * the same box can allocate the same item twice, same as a real
 * randomized box would) from the box's configured MysteryBoxContent
 * pool, weighted by probability.
 *
 * Falls back gracefully to zero allocated items (not an error) if the
 * box has no MysteryBoxContent configured yet.
 */
export async function openMysteryBoxReveal(tx: Tx, params: { revealId: string; userId: string }) {
  const reveal = await tx.mysteryBoxReveal.findUniqueOrThrow({
    where: { id: params.revealId },
    include: { orderItem: true },
  });

  if (reveal.userId !== params.userId) throw new RevealOwnershipError();
  if (reveal.revealedAt) throw new AlreadyRevealedError();

  const box = await tx.product.findUniqueOrThrow({
    where: { id: reveal.orderItem.productId },
    select: { mysteryBoxLockedCount: true, mysteryBoxChooseCount: true },
  });
  const chooseCount = box.mysteryBoxChooseCount ?? 0;
  const lockedCount = box.mysteryBoxLockedCount ?? 1;

  // Choices must be locked in first if this box has a CHOICE pool — the
  // reveal page always calls submitChoices() before this, but this guard
  // makes it impossible to finalize a hybrid box without real choices,
  // even via a direct API call.
  if (chooseCount > 0 && !reveal.chosenProductIds) {
    throw new Error("Please make your picks before opening the box.");
  }

  const lockedPool = await tx.mysteryBoxContent.findMany({
    where: { mysteryBoxId: reveal.orderItem.productId, poolType: "LOCKED" },
    select: { possibleProductId: true, probability: true, isSpecialItem: true },
  });

  const quantity = reveal.orderItem.quantity;
  const picks: { productId: string; isSpecialItem: boolean }[] = [];

  if (lockedPool.length > 0) {
    const weightedPool = lockedPool.map((p) => ({ ...p, probability: Number(p.probability) }));
    for (let i = 0; i < quantity * lockedCount; i++) {
      const picked = weightedPick(weightedPool);
      picks.push({ productId: picked.possibleProductId, isSpecialItem: picked.isSpecialItem });
    }
  }

  // Add the customer's real, already-validated CHOICE picks (once per unit purchased).
  const chosenIds = (reveal.chosenProductIds as string[] | null) ?? [];
  for (let unit = 0; unit < quantity; unit++) {
    for (const productId of chosenIds) {
      picks.push({ productId, isSpecialItem: false });
    }
  }

  await tx.mysteryBoxReveal.update({
    where: { id: params.revealId },
    data: { revealedAt: new Date() },
  });

  if (picks.length > 0) {
    // Consolidate duplicate picks into a single row with quantity>1 for a
    // cleaner reveal display (e.g. "Product A x2" instead of two rows).
    const grouped = new Map<string, number>();
    for (const p of picks) grouped.set(p.productId, (grouped.get(p.productId) ?? 0) + 1);

    await tx.mysteryBoxRevealItem.createMany({
      data: Array.from(grouped.entries()).map(([productId, qty]) => ({
        revealId: params.revealId,
        productId,
        quantity: qty,
      })),
    });
  }

  return { hadConfiguredContents: lockedPool.length > 0 || chosenIds.length > 0 };
}
