/**
 * SECURITY BOUNDARY
 * ============================================================
 * The real mechanism behind every isolation guarantee this layer
 * makes. Every customer-scoped access function calls
 * assertOwnership() before returning any data.
 * ============================================================
 */
import { AccessDeniedError } from "./types";

/**
 * Throws AccessDeniedError unless the requester IS the data owner.
 * No admin bypass here on purpose — admin tooling has its own,
 * separately-authorized read paths. This layer's job is
 * specifically "can customer X read customer Y's data", and the
 * honest answer is never yes.
 */
export function assertOwnership(requestingUserId: string | null | undefined, targetCustomerId: string, resource: string): void {
  if (!requestingUserId || requestingUserId !== targetCustomerId) {
    throw new AccessDeniedError(resource);
  }
}

/**
 * Explicit allowlist-based projection — used anywhere this layer
 * builds a return object from a warehouse/DB row that has more
 * fields than the public type permits.
 */
export function pickAllowed<T extends object, K extends keyof T>(source: T, allowedKeys: readonly K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of allowedKeys) {
    result[key] = source[key];
  }
  return result;
}

/**
 * Fields that must never appear in ANY customer-facing or
 * public-facing result from this layer, regardless of which
 * access function produced it.
 */
export const FORBIDDEN_CUSTOMER_FACING_FIELDS = [
  "purchaseCost",
  "commission",
  "commissionAmount",
  "commissionRate",
  "supplierAmount",
  "netPayable",
  "passwordHash",
  "supplierId",
  "ownerUserId",
  "reservedStock",
] as const;

/** Real, automated leak check — recursively scans a result object's keys against the forbidden list. */
export function scanForForbiddenFields(obj: unknown, path = ""): string[] {
  const violations: string[] = [];
  if (obj === null || typeof obj !== "object") return violations;

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const currentPath = path ? `${path}.${key}` : key;
    if ((FORBIDDEN_CUSTOMER_FACING_FIELDS as readonly string[]).includes(key)) {
      violations.push(currentPath);
    }
    if (value && typeof value === "object") {
      violations.push(...scanForForbiddenFields(value, currentPath));
    }
  }
  return violations;
}
