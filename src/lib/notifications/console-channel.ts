import type { NotificationChannel } from "./types";

/**
 * Temporary stand-in channel. Logs to the server console so the event
 * layer is visibly wired up end-to-end during development, without
 * committing to any real delivery provider yet.
 *
 * Replace/supplement with real channels (email-channel.ts,
 * sms-channel.ts, whatsapp-channel.ts, push-channel.ts) in `service.ts`
 * when ready — this file can then be removed or kept for local dev.
 */
export const consoleChannel: NotificationChannel = {
  name: "console",
  async send(event) {
    console.log(`[notification:${event.type}]`, {
      recipientUserId: event.recipientUserId,
      recipientEmail: event.recipientEmail,
      data: event.data,
      at: event.createdAt.toISOString(),
    });
  },
};
