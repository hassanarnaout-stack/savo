import { prisma } from "@/lib/prisma";
import { emailProvider } from "@/lib/email/provider";
import { logger } from "@/lib/logger";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  type: string; // e.g. "WELCOME_EMAIL", "ORDER_CREATED" — matches NotificationEventType where applicable
  userId?: string | null;
}

/**
 * Every call is logged to `EmailLog` — SENT, FAILED, or SKIPPED (no
 * provider configured). Never throws: a failed/unconfigured email must
 * never break the business operation that triggered it (order creation,
 * registration, etc.) — see NotificationService's fire-and-forget
 * contract, which this follows.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!emailProvider.isConfigured()) {
    await logAttempt(params, "SKIPPED", "No email provider configured");
    return;
  }

  try {
    const result = await emailProvider.send({ to: params.to, subject: params.subject, html: params.html });
    if (result.delivered) {
      await logAttempt(params, "SENT");
    } else {
      await logAttempt(params, "FAILED", result.errorMessage);
      logger.warn("Email delivery failed", { type: params.type, to: params.to, error: result.errorMessage });
    }
  } catch (err) {
    await logAttempt(params, "FAILED", err instanceof Error ? err.message : String(err));
    logger.error("Email send threw unexpectedly", err, { type: params.type, to: params.to });
  }
}

async function logAttempt(params: SendEmailParams, status: "SENT" | "FAILED" | "SKIPPED", errorMessage?: string) {
  try {
    await prisma.emailLog.create({
      data: {
        userId: params.userId ?? null,
        type: params.type,
        recipient: params.to,
        status,
        errorMessage,
      },
    });
  } catch (err) {
    // Logging the log failure to the structured logger only — an
    // EmailLog write failure must never cascade into breaking whatever
    // triggered the email in the first place.
    logger.error("Could not write EmailLog row", err, { type: params.type });
  }
}
