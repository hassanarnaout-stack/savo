/**
 * CONVERSATION MEMORY
 * ============================================================
 * In-memory, session-scoped. Same pattern as warehouse-cache.ts —
 * a process-local Map, not a new database table.
 *
 * Never stores prices/balances/totals independently — only
 * conversational preferences (budget mentioned, category
 * discussed, product IDs mentioned), always re-verified against
 * real current data on every response.
 * ============================================================
 */
import { ConversationMemory } from "./types";

const SESSION_TTL_MS = 30 * 60 * 1000;
const store = new Map<string, ConversationMemory>();

export function getMemory(sessionId: string): ConversationMemory {
  const existing = store.get(sessionId);
  if (existing && Date.now() - existing.lastUpdated < SESSION_TTL_MS) {
    return existing;
  }
  const fresh: ConversationMemory = { sessionId, budget: null, category: null, brand: null, productsDiscussed: [], currentIntent: "UNKNOWN", lastUpdated: Date.now() };
  store.set(sessionId, fresh);
  return fresh;
}

export function updateMemory(sessionId: string, updates: Partial<Omit<ConversationMemory, "sessionId" | "lastUpdated">>): ConversationMemory {
  const current = getMemory(sessionId);
  const updated: ConversationMemory = {
    ...current,
    ...updates,
    productsDiscussed: updates.productsDiscussed
      ? [...new Set([...current.productsDiscussed, ...updates.productsDiscussed])].slice(-10)
      : current.productsDiscussed,
    lastUpdated: Date.now(),
  };
  store.set(sessionId, updated);
  return updated;
}

export function clearMemory(sessionId: string): void {
  store.delete(sessionId);
}

export function pruneExpiredSessions(): number {
  const now = Date.now();
  let pruned = 0;
  for (const [sessionId, mem] of store.entries()) {
    if (now - mem.lastUpdated >= SESSION_TTL_MS) {
      store.delete(sessionId);
      pruned++;
    }
  }
  return pruned;
}
