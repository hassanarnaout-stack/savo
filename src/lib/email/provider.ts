/**
 * Email Provider — Phase 5.1
 *
 * Deliberately has ZERO reference to the `resend` package (or any SMTP
 * library) anywhere in this file's imports. Lesson learned the hard way
 * in Phase 4.5 (src/lib/sentry.ts): Next.js's webpack build statically
 * resolves `import()` calls even when they're behind a runtime
 * condition, so a dynamic import of an uninstalled package still fails
 * the build. The only way to make this genuinely optional until a real
 * provider is installed is to not reference the package at all.
 *
 * Until `RESEND_API_KEY` (or SMTP_* vars) are set AND the provider
 * package is installed, every send is logged to `EmailLog` with status
 * SKIPPED and nothing is actually delivered — visible, not silent.
 *
 * TO ACTIVATE (Resend — recommended, simplest for transactional email):
 *   1. npm install resend
 *   2. Set RESEND_API_KEY and EMAIL_FROM_ADDRESS in your environment
 *   3. Uncomment the Resend implementation below and remove the
 *      "not configured" branch's early return.
 *
 * TO ACTIVATE (generic SMTP instead):
 *   1. npm install nodemailer
 *   2. Set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / EMAIL_FROM_ADDRESS
 *   3. Implement an SmtpProvider following the same EmailProvider shape.
 */

export interface EmailProviderResult {
  delivered: boolean;
  errorMessage?: string;
}

export interface EmailProvider {
  isConfigured(): boolean;
  send(params: { to: string; subject: string; html: string }): Promise<EmailProviderResult>;
}

const resendConfigured = !!process.env.RESEND_API_KEY;

export const emailProvider: EmailProvider = {
  isConfigured() {
    return resendConfigured;
  },

  async send({ to, subject, html }) {
    if (!resendConfigured) {
      return { delivered: false, errorMessage: "No email provider configured (RESEND_API_KEY not set)" };
    }

    // --- Activate by installing `resend` and uncommenting: ---------------
    // const { Resend } = await import("resend");
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // try {
    //   await resend.emails.send({
    //     from: process.env.EMAIL_FROM_ADDRESS ?? "Saveo <no-reply@saveo.com.kw>",
    //     to,
    //     subject,
    //     html,
    //   });
    //   return { delivered: true };
    // } catch (err) {
    //   return { delivered: false, errorMessage: err instanceof Error ? err.message : String(err) };
    // }
    // -----------------------------------------------------------------------

    return { delivered: false, errorMessage: "Provider package not installed — see activation steps in this file" };
  },
};
