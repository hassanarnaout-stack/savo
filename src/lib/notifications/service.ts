import type { NotificationChannel, NotificationEvent } from "./types";
import { consoleChannel } from "./console-channel";
import { emailChannel } from "@/lib/email/channel";

/**
 * Registered delivery channels. Phase 5.1 added `emailChannel` — it's
 * safe to have here even before a real provider (Resend/SMTP) is
 * configured: unconfigured sends are logged to EmailLog as SKIPPED, not
 * silently dropped, and never throw (see src/lib/email/send.ts).
 */
const channels: NotificationChannel[] = [consoleChannel, emailChannel];

export const NotificationService = {
  /**
   * Fire-and-forget by design: callers should NOT await this inside a
   * Prisma transaction (notification delivery is not part of the
   * database's atomicity guarantees). Call it after the transaction
   * commits successfully.
   */
  async dispatch(event: Omit<NotificationEvent, "createdAt">): Promise<void> {
    const fullEvent: NotificationEvent = { ...event, createdAt: new Date() };
    const results = await Promise.allSettled(channels.map((c) => c.send(fullEvent)));
    for (const [i, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error(`[notification] channel "${channels[i].name}" failed:`, result.reason);
      }
    }
  },
};
