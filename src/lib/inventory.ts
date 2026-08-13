import type { Prisma, ProductStatus, InventoryActionType } from "@prisma/client";

/**
 * All functions here take `tx` (a Prisma transaction client, from
 * `prisma.$transaction(async (tx) => ...)`) rather than the top-level
 * `prisma` client. This is intentional: every stock mutation must be
 * atomic with its InventoryHistory row and any related Product.status
 * flip, so callers are required to wrap their whole operation (e.g. an
 * entire multi-item checkout) in a single transaction and pass it down.
 */
type Tx = Prisma.TransactionClient;

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

/** AvailableStock is never persisted — always derive it with this. */
export function getAvailableStock(stockQty: number, reservedStock: number): number {
  return Math.max(0, stockQty - reservedStock);
}

export function getStockStatus(stockQty: number, reservedStock: number, lowStockAlert: number): StockStatus {
  const available = getAvailableStock(stockQty, reservedStock);
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= lowStockAlert) return "LOW_STOCK";
  return "IN_STOCK";
}

/**
 * Decides whether a stock change should flip Product.status between
 * ACTIVE and OUT_OF_STOCK. Never touches DRAFT or ARCHIVED — those are
 * the supplier's/admin's explicit choices and inventory changes must not
 * silently override them. Returns null when no status change is needed.
 */
export function deriveStatusChange(currentStatus: ProductStatus, availableAfter: number): ProductStatus | null {
  if (currentStatus === "DRAFT" || currentStatus === "ARCHIVED") return null;
  if (availableAfter <= 0 && currentStatus !== "OUT_OF_STOCK") return "OUT_OF_STOCK";
  if (availableAfter > 0 && currentStatus === "OUT_OF_STOCK") return "ACTIVE";
  return null;
}

interface HistoryInput {
  productId: string;
  supplierId: string;
  previousQuantity: number;
  newQuantity: number;
  actionType: InventoryActionType;
  userId?: string | null;
  note?: string;
}

async function writeHistory(tx: Tx, input: HistoryInput) {
  await tx.inventoryHistory.create({
    data: {
      productId: input.productId,
      supplierId: input.supplierId,
      previousQuantity: input.previousQuantity,
      newQuantity: input.newQuantity,
      difference: input.newQuantity - input.previousQuantity,
      actionType: input.actionType,
      userId: input.userId ?? null,
      note: input.note,
    },
  });
}

/**
 * Directly sets the current stock count (supplier editing the number in
 * the dashboard, or the initial value on product creation). Tracks
 * stockQty. Does not touch reservedStock.
 */
export async function setStockQuantity(
  tx: Tx,
  params: {
    productId: string;
    supplierId: string;
    newQuantity: number;
    userId?: string | null;
    actionType?: "MANUAL_UPDATE" | "RESTOCK";
    note?: string;
  }
) {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: params.productId },
    select: { stockQty: true, reservedStock: true, status: true, supplierId: true },
  });

  if (product.supplierId !== params.supplierId) {
    throw new Error("STOCK_UPDATE_SUPPLIER_MISMATCH");
  }

  const clamped = Math.max(0, params.newQuantity);

  await writeHistory(tx, {
    productId: params.productId,
    supplierId: params.supplierId,
    previousQuantity: product.stockQty,
    newQuantity: clamped,
    actionType: params.actionType ?? "MANUAL_UPDATE",
    userId: params.userId,
    note: params.note,
  });

  const available = getAvailableStock(clamped, product.reservedStock);
  const statusChange = deriveStatusChange(product.status, available);

  await tx.product.update({
    where: { id: params.productId },
    data: { stockQty: clamped, ...(statusChange ? { status: statusChange } : {}) },
  });
}

/**
 * Called at checkout time. Does NOT touch stockQty — only increases
 * reservedStock, so the physical count stays accurate until the order is
 * actually fulfilled (ORDER_COMPLETED) or cancelled (ORDER_RELEASED).
 */
export async function reserveStock(
  tx: Tx,
  params: { productId: string; supplierId: string; quantity: number; userId?: string | null; note?: string }
) {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: params.productId },
    select: { stockQty: true, reservedStock: true, status: true, supplierId: true },
  });

  if (product.supplierId !== params.supplierId) {
    throw new Error("STOCK_UPDATE_SUPPLIER_MISMATCH");
  }

  const newReserved = product.reservedStock + params.quantity;

  // Real atomic capacity check — this is what actually prevents overselling.
  // The earlier check in the checkout route happens BEFORE this transaction
  // starts, so two concurrent requests can both pass that check for the
  // same last unit. This re-verification, done right here at the moment of
  // reservation inside the transaction, is the real guard.
  if (newReserved > product.stockQty) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  await writeHistory(tx, {
    productId: params.productId,
    supplierId: params.supplierId,
    previousQuantity: product.reservedStock,
    newQuantity: newReserved,
    actionType: "ORDER_RESERVED",
    userId: params.userId,
    note: params.note,
  });

  const available = getAvailableStock(product.stockQty, newReserved);
  const statusChange = deriveStatusChange(product.status, available);

  await tx.product.update({
    where: { id: params.productId },
    data: { reservedStock: newReserved, ...(statusChange ? { status: statusChange } : {}) },
  });
}

/**
 * Called when a SupplierOrder is CANCELLED before fulfillment. Releases
 * the held reservation back to available stock — stockQty is untouched
 * because nothing was ever physically deducted.
 */
export async function releaseReservedStock(
  tx: Tx,
  params: { productId: string; supplierId: string; quantity: number; userId?: string | null; note?: string }
) {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: params.productId },
    select: { stockQty: true, reservedStock: true, status: true, supplierId: true },
  });

  if (product.supplierId !== params.supplierId) {
    throw new Error("STOCK_UPDATE_SUPPLIER_MISMATCH");
  }

  const newReserved = Math.max(0, product.reservedStock - params.quantity);

  await writeHistory(tx, {
    productId: params.productId,
    supplierId: params.supplierId,
    previousQuantity: product.reservedStock,
    newQuantity: newReserved,
    actionType: "ORDER_RELEASED",
    userId: params.userId,
    note: params.note,
  });

  const available = getAvailableStock(product.stockQty, newReserved);
  const statusChange = deriveStatusChange(product.status, available);

  await tx.product.update({
    where: { id: params.productId },
    data: { reservedStock: newReserved, ...(statusChange ? { status: statusChange } : {}) },
  });
}

/**
 * Called when a SupplierOrder is marked DELIVERED. This is the only point
 * where stock is actually, physically deducted — both stockQty and the
 * matching reservedStock go down together, so nothing is double-counted.
 */
export async function completeReservedStock(
  tx: Tx,
  params: { productId: string; supplierId: string; quantity: number; userId?: string | null; note?: string }
) {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: params.productId },
    select: { stockQty: true, reservedStock: true, status: true, supplierId: true },
  });

  if (product.supplierId !== params.supplierId) {
    throw new Error("STOCK_UPDATE_SUPPLIER_MISMATCH");
  }

  const newStockQty = Math.max(0, product.stockQty - params.quantity);
  const newReserved = Math.max(0, product.reservedStock - params.quantity);

  await writeHistory(tx, {
    productId: params.productId,
    supplierId: params.supplierId,
    previousQuantity: product.stockQty,
    newQuantity: newStockQty,
    actionType: "ORDER_COMPLETED",
    userId: params.userId,
    note: params.note,
  });

  const available = getAvailableStock(newStockQty, newReserved);
  const statusChange = deriveStatusChange(product.status, available);

  await tx.product.update({
    where: { id: params.productId },
    data: {
      stockQty: newStockQty,
      reservedStock: newReserved,
      soldQuantity: { increment: params.quantity },
      ...(statusChange ? { status: statusChange } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Phase 5.3 §4 — Returns, Damage, Expiry. Each removes stock from sellable
// inventory (stockQty goes down) while incrementing its own tracked
// counter, and writes an InventoryHistory row like every other stock
// mutation in this file.
// ---------------------------------------------------------------------------

async function adjustForLoss(
  tx: Tx,
  params: { productId: string; supplierId: string; quantity: number; userId?: string | null; note?: string },
  actionType: "RETURNED" | "DAMAGED" | "EXPIRED",
  counterField: "returnedQuantity" | "damagedQuantity" | "expiredQuantity"
) {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: params.productId },
    select: { stockQty: true, status: true, supplierId: true },
  });

  if (product.supplierId !== params.supplierId) {
    throw new Error("STOCK_UPDATE_SUPPLIER_MISMATCH");
  }

  // RETURNED puts an item back into sellable stock if it came back in good
  // condition; DAMAGED and EXPIRED remove it from sellable stock entirely.
  const newStockQty =
    actionType === "RETURNED" ? product.stockQty + params.quantity : Math.max(0, product.stockQty - params.quantity);

  await writeHistory(tx, {
    productId: params.productId,
    supplierId: params.supplierId,
    previousQuantity: product.stockQty,
    newQuantity: newStockQty,
    actionType,
    userId: params.userId,
    note: params.note,
  });

  const available = getAvailableStock(newStockQty, 0);
  const statusChange = deriveStatusChange(product.status, available);

  await tx.product.update({
    where: { id: params.productId },
    data: {
      stockQty: newStockQty,
      [counterField]: { increment: params.quantity },
      ...(statusChange ? { status: statusChange } : {}),
    },
  });
}

export async function recordReturn(
  tx: Tx,
  params: { productId: string; supplierId: string; quantity: number; userId?: string | null; note?: string }
) {
  return adjustForLoss(tx, params, "RETURNED", "returnedQuantity");
}

export async function recordDamage(
  tx: Tx,
  params: { productId: string; supplierId: string; quantity: number; userId?: string | null; note?: string }
) {
  return adjustForLoss(tx, params, "DAMAGED", "damagedQuantity");
}

export async function recordExpiry(
  tx: Tx,
  params: { productId: string; supplierId: string; quantity: number; userId?: string | null; note?: string }
) {
  return adjustForLoss(tx, params, "EXPIRED", "expiredQuantity");
}
