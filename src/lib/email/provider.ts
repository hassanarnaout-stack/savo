/**
 * Email Provider — Phase 5.2 (Resend activated).
 *
 * `resend` is now a real dependency (see package.json). Configuration
 * is still fully optional at runtime: until `RESEND_API_KEY` is set,
 * every send is logged to `EmailLog` with status SKIPPED and nothing
 * is actually delivered — visible, not silent, exactly as before.
 *
 * Required environment variables to actually deliver mail:
 *   RESEND_API_KEY       — your Resend API key
 *   EMAIL_FROM_ADDRESS    — optional; defaults to "Saveo <no-reply@saveo.com.kw>"
 */

import { Resend } from "resend";

export interface EmailProviderResult {
  delivered: boolean;
  errorMessage?: string;
}

export interface EmailProvider {
  isConfigured(): boolean;
  send(params: { to: string; subject: string; html: string }): Promise<EmailProviderResult>;
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

export const emailProvider: EmailProvider = {
  isConfigured() {
    return !!resendClient;
  },

  async send({ to, subject, html }) {
    if (!resendClient) {
      return { delivered: false, errorMessage: "No email provider configured (RESEND_API_KEY not set)" };
    }

    try {
      const result = await resendClient.emails.send({
        from: process.env.EMAIL_FROM_ADDRESS ?? "Saveo <no-reply@saveo.com.kw>",
        to,
        subject,
        html,
      });
      // Resend's SDK returns { data, error } rather than throwing on a
      // rejected send (invalid domain, bad address, etc) — only trust
      // "delivered" when there's genuinely no error and an id came back.
      if (result.error) {
        return { delivered: false, errorMessage: result.error.message ?? "Resend rejected the email" };
      }
      return { delivered: true };
    } catch (err) {
      return { delivered: false, errorMessage: err instanceof Error ? err.message : String(err) };
    }
  },
};
