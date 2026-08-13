const KEY = "saveo:recently-viewed";
const MAX_ITEMS = 12;

/** Call this from a product detail page to record a view. */
export function trackProductView(productId: string) {
  if (typeof window === "undefined") return;
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const next = [productId, ...existing.filter((id) => id !== productId)].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage can throw in private browsing / disabled-storage
    // contexts — recently-viewed is a nice-to-have, never worth crashing over.
  }
}

export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
