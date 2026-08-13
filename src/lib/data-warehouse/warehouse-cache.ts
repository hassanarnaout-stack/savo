/**
 * WAREHOUSE CACHE
 * ============================================================
 * In-process, in-memory cache. Deliberately NOT a new Prisma model
 * or database table — the brief forbids schema changes, and an
 * in-memory Map is the correct additive-only way to hold "already
 * computed, don't recompute on every read" data.
 *
 * Honest limitation (documented, not hidden): this cache is
 * per-process. On a multi-instance deployment, each instance
 * builds and holds its own copy. That's fine for the platform's
 * current single-instance deployment (same honest limitation
 * already documented for src/lib/rate-limit.ts) and is the right
 * foundation to swap for Redis later without changing any
 * caller's code, since callers only ever go through get/set/has.
 * ============================================================
 */
import { BuildStats } from "./types";

interface CacheEntry<T> {
  data: T;
  builtAt: number;
  buildStats: BuildStats;
}

class WarehouseCacheStore {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, buildStats: BuildStats): void {
    this.store.set(key, { data, builtAt: Date.now(), buildStats });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    return entry ? (entry.data as T) : null;
  }

  getEntry<T>(key: string): CacheEntry<T> | null {
    return (this.store.get(key) as CacheEntry<T> | undefined) ?? null;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  keysWithPrefix(prefix: string): string[] {
    return Array.from(this.store.keys()).filter((k) => k.startsWith(prefix));
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const warehouseCache = new WarehouseCacheStore();

export function cacheKey(type: string, id: string): string {
  return `${type}:${id}`;
}
