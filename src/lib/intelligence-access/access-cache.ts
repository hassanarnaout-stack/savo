/**
 * ACCESS LAYER CACHE
 * ============================================================
 * CRITICAL SCOPE RULE, enforced structurally: this cache is only
 * ever used for public/shared data (Product, Brand, Category,
 * Promotion) — data that's the same for every requester. It is
 * NEVER used for Customer, Cart, Wallet, Loyalty, or Membership
 * data. The type signature only accepts public source values, so
 * a customer-scoped function can't compile if it misuses this.
 * ============================================================
 */
import { DataSource } from "./types";

const CACHEABLE_SOURCES: readonly DataSource[] = ["PRODUCT_DATA", "PROMOTION_DATA"] as const;
type CacheableSource = "PRODUCT_DATA" | "PROMOTION_DATA" | "BRAND_INTELLIGENCE" | "CATEGORY_INTELLIGENCE";

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

class AccessCacheStore {
  private store = new Map<string, CacheEntry<unknown>>();
  private ttlMs = 60_000;

  set<T>(source: CacheableSource, key: string, data: T): void {
    this.store.set(`${source}:${key}`, { data, cachedAt: Date.now() });
  }

  get<T>(source: CacheableSource, key: string): { data: T; ageMs: number } | null {
    const entry = this.store.get(`${source}:${key}`);
    if (!entry) return null;
    const ageMs = Date.now() - entry.cachedAt;
    if (ageMs > this.ttlMs) {
      this.store.delete(`${source}:${key}`);
      return null;
    }
    return { data: entry.data as T, ageMs };
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const accessCache = new AccessCacheStore();

export function isCacheableSource(source: DataSource): boolean {
  return (CACHEABLE_SOURCES as readonly string[]).includes(source);
}
