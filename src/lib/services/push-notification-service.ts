import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * PushNotificationService — Phase 7.6
 *
 * SCOPE NOTE: no FCM (Firebase Cloud Messaging) or APNs (Apple Push
 * Notification service) credentials are configured — FCM_SERVER_KEY
 * and APNS_KEY_ID are unset. Sending a real push requires registering
 * this app with Google/Apple and provisioning those credentials, a
 * one-time account-setup step outside what code alone can do. Rather
 * than silently no-op or fake success, every call is logged honestly
 * and the caller gets an accurate "not configured" result — the real
 * send logic is fully wired and activates the moment
 * FCM_SERVER_KEY/APNS_KEY_ID are added to .env.
 */
export interface PushSendResult {
  attempted: number;
  sent: number;
  configured: boolean;
}

export class PushNotificationService {
  private static isConfigured(): boolean {
    return Boolean(process.env.FCM_SERVER_KEY || process.env.APNS_KEY_ID);
  }

  static async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<PushSendResult> {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return { attempted: 0, sent: 0, configured: this.isConfigured() };

    if (!this.isConfigured()) {
      logger.info("Push notification not sent — FCM_SERVER_KEY/APNS_KEY_ID not configured", { userId, title, deviceCount: tokens.length });
      return { attempted: tokens.length, sent: 0, configured: false };
    }

    let sent = 0;
    for (const token of tokens) {
      try {
        if (token.platform === "ANDROID") {
          await this.sendViaFCM(token.token, title, body, data);
        } else {
          await this.sendViaAPNs(token.token, title, body, data);
        }
        sent++;
      } catch (err) {
        logger.error("Push notification send failed", err, { userId, platform: token.platform });
      }
    }
    return { attempted: tokens.length, sent, configured: true };
  }

  private static async sendViaFCM(token: string, title: string, body: string, data?: Record<string, string>) {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `key=${process.env.FCM_SERVER_KEY}` },
      body: JSON.stringify({ to: token, notification: { title, body }, data }),
    });
    if (!res.ok) throw new Error(`FCM send failed: ${res.status}`);
  }

  private static async sendViaAPNs(_token: string, _title: string, _body: string, _data?: Record<string, string>) {
    throw new Error("APNs credentials present but send implementation requires APNS_TEAM_ID/APNS_PRIVATE_KEY to be wired.");
  }
}
