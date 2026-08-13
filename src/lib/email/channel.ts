import type { NotificationChannel, NotificationEvent } from "@/lib/notifications/types";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import * as templates from "@/lib/email/templates";
import type { EmailLocale } from "@/lib/email/templates";

/**
 * Maps existing NotificationEventType values to an email template. Not
 * every event type has (or needs) an email — e.g. LOW_STOCK_ALERT and
 * OUT_OF_STOCK_ALERT are supplier-dashboard-only signals for now, so
 * they're intentionally absent here and simply produce no email.
 *
 * Locale: the app doesn't yet track a per-user preferred language, so
 * this defaults to English except where the event's `data` explicitly
 * carries a `locale` hint (checkout/registration could be extended to
 * pass the customer's current site locale later — a one-line addition
 * at each dispatch call site, not a channel-layer change).
 */
async function buildEmail(event: NotificationEvent): Promise<{ subject: string; html: string } | null> {
  const locale: EmailLocale = (event.data.locale as EmailLocale) ?? "en";
  const d = event.data as Record<string, any>;

  switch (event.type) {
    case "ORDER_CREATED":
      return templates.orderConfirmationEmail(locale, { orderNumber: d.orderNumber, total: d.total, orderId: d.orderId });
    case "ORDER_ACCEPTED":
    case "ORDER_SHIPPED":
    case "ORDER_DELIVERED":
      return templates.orderStatusChangedEmail(locale, {
        orderNumber: d.parentOrderNumber,
        newStatus: event.type.replace("ORDER_", ""),
        orderId: d.orderId ?? "",
      });
    case "MEMBERSHIP_ACTIVATED":
      return templates.membershipActivatedEmail(locale, { planName: d.planName, endsAt: new Date(d.endsAt) });
    case "SUPPLIER_APPLICATION_SUBMITTED":
      return templates.supplierRegistrationReceivedEmail(locale, { companyName: d.companyName });
    case "SUPPLIER_APPLICATION_APPROVED":
      return templates.supplierApprovedEmail(locale, { companyName: d.companyName });
    case "WELCOME_EMAIL":
      return templates.welcomeEmail(locale, { name: d.name });
    case "NEW_SUPPLIER_ORDER":
      return templates.newSupplierOrderEmail(locale, { supplierOrderNumber: d.supplierOrderNumber });
    case "PRODUCT_APPROVAL_NEEDED":
      return templates.productApprovalNeededEmail({ productName: d.productName, supplierName: d.supplierName });
    case "NEW_SUPPLIER_REQUEST":
      return templates.newSupplierRequestEmail({ companyName: d.companyName, supplierId: d.supplierId });
    case "CUSTOMER_ISSUE_CREATED":
      return templates.customerIssueCreatedEmail({ subject: d.subject, orderNumber: d.orderNumber });
    default:
      return null; // no email mapped for this event type
  }
}

export const emailChannel: NotificationChannel = {
  name: "email",

  async send(event: NotificationEvent) {
    const email = await buildEmail(event);
    if (!email) return; // this event type doesn't have an email — not an error

    let to = event.recipientEmail ?? null;
    if (!to && event.recipientUserId) {
      const user = await prisma.user.findUnique({ where: { id: event.recipientUserId }, select: { email: true } });
      to = user?.email ?? null;
    }
    if (!to) return; // nothing to send to — silently skip, don't throw

    await sendEmail({
      to,
      subject: email.subject,
      html: email.html,
      type: event.type,
      userId: event.recipientUserId,
    });
  },
};
