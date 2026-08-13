const KEY = "saveo:analytics-session";

/** A stable, anonymous id for grouping this browser's activity across visits — not tied to any account. */
export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // localStorage can throw in private browsing / disabled-storage contexts.
    return "unknown";
  }
}
