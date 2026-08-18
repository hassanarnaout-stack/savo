import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a price in Kuwaiti Dinar (3 decimal places, per fils convention). */
export function formatKWD(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  // U+2066 (LRI) / U+2069 (PDI) — invisible Unicode bidi isolation.
  // Guarantees "KD X.XXX" always renders left-to-right internally
  // (KD, then the number) even when embedded inside Arabic/RTL text,
  // without needing a JSX wrapper — works in every context this
  // string is used in (toast messages, alt text, aria-labels, plain
  // template literals), not just rendered JSX.
  return `\u2066KD ${num.toFixed(3)}\u2069`;
}

/**
 * Single source of truth for discount math.
 * Always derive discount % from originalPrice/saveoPrice rather than
 * trusting a stored value, to avoid drift.
 */
export function calcDiscountPct(originalPrice: number, saveoPrice: number): number {
  if (originalPrice <= 0 || saveoPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - saveoPrice) / originalPrice) * 100);
}

export function calcSavings(originalPrice: number, saveoPrice: number): number {
  return Math.max(0, originalPrice - saveoPrice);
}

/** Generate a human-friendly order number, e.g. SVO-284193 */
export function generateOrderNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SVO-${rand}`;
}

/** Generate a human-friendly supplier order number, e.g. SO-482913 */
export function generateSupplierOrderNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SO-${rand}`;
}

/** Returns ms remaining until a deal ends; null if no deadline or already expired. */
export function getDealTimeRemaining(dealEndsAt: Date | string | null): number | null {
  if (!dealEndsAt) return null;
  const end = new Date(dealEndsAt).getTime();
  const diff = end - Date.now();
  return diff > 0 ? diff : null;
}

export function isDealActive(dealStartsAt: Date | string | null, dealEndsAt: Date | string | null): boolean {
  const now = Date.now();
  const started = !dealStartsAt || new Date(dealStartsAt).getTime() <= now;
  const notEnded = !dealEndsAt || new Date(dealEndsAt).getTime() > now;
  return started && notEnded;
}

export function formatMsToClock(ms: number): { hours: string; minutes: string; seconds: string; days: number } {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days,
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

export function isLowStock(stockQty: number, lowStockAlert: number): boolean {
  return stockQty > 0 && stockQty <= lowStockAlert;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Prisma's Decimal fields (originalPrice, saveoPrice, mysteryBoxValueMin/Max,
 * commissionRate, etc.) are class instances, not plain objects — React
 * Server Components cannot pass them as props into "use client" components.
 * Any page/query that hands product data to a client component must run it
 * through this first.
 */
/**
 * Duck-types a Prisma Decimal instance (from decimal.js under the
 * hood) without importing it directly, so this stays a generic utility.
 */
function isPrismaDecimal(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).toNumber === "function" &&
    typeof (value as any).toFixed === "function"
  );
}

/**
 * Fix (real bug) — this used to convert only a hardcoded list of field
 * names ("originalPrice", "saveoPrice", ...), which went stale every
 * time a new Decimal field (vatRate, purchaseCost, etc.) was added to
 * the Product model, throwing "Only plain objects can be passed to
 * Client Components... Decimal objects are not supported" at runtime.
 * Now converts ANY Decimal-shaped value on the object generically —
 * no field-name list to maintain, safe against future schema changes.
 */
export function serializeProduct<T extends Record<string, any>>(product: T): T {
  function serializeValue(value: any): any {
    if (isPrismaDecimal(value)) return value.toNumber();
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map(serializeValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, serializeValue(nested)]));
    }
    return value;
  }

  return serializeValue(product) as T;
}

export function serializeProducts<T extends Record<string, any>>(products: T[]): T[] {
  return products.map(serializeProduct);
}
