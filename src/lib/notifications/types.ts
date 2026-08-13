/**
 * Notification architecture (Phase 3.3).
 *
 * This is intentionally an EVENT LAYER, not a real notification sender.
 * Business logic (order status transitions, supplier approval, etc.)
 * calls `NotificationService.dispatch(event)` and moves on — it never
 * knows or cares whether that turns into an email, an SMS, a push
 * notification, or nothing at all yet.
 *
 * To wire up a real channel later (e.g. email via Resend, WhatsApp via
 * Twilio), implement `NotificationChannel` and register it in
 * `service.ts`'s `channels` array. No caller of `dispatch()` needs to
 * change.
 */

export type NotificationEventType =
  | "SUPPLIER_ORDER_STATUS_CHANGED" // a SupplierOrder moved to a new status
  | "SUPPLIER_APPLICATION_SUBMITTED" // new supplier registered, pending review
  | "SUPPLIER_APPLICATION_APPROVED"
  | "SUPPLIER_APPLICATION_REJECTED"
  | "SUPPLIER_ACCOUNT_SUSPENDED"
  | "LOW_STOCK_ALERT"
  | "OUT_OF_STOCK_ALERT"
  // Phase 5 — customer-lifecycle events, ready for a real email/SMS/push
  // channel to be plugged in later. Fired but not yet delivered anywhere
  // (see NotificationChannel docs above).
  | "ORDER_CREATED"
  | "ORDER_ACCEPTED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "MEMBERSHIP_ACTIVATED"
  | "MYSTERY_BOX_READY"
  // Phase 5.1 — email-specific events not previously tracked
  | "WELCOME_EMAIL"
  | "NEW_SUPPLIER_ORDER" // supplier-facing: distinct from the customer's ORDER_CREATED
  | "PRODUCT_APPROVAL_NEEDED" // admin-facing
  | "NEW_SUPPLIER_REQUEST" // admin-facing
  | "CUSTOMER_ISSUE_CREATED" // admin-facing
  | "MARKETING_AUTOMATION"; // Phase 6.7 — customer-facing, triggered by MarketingAutomation rules

export interface NotificationEvent {
  type: NotificationEventType;
  /** Who this is about, if it's tied to a specific account. */
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  /** Arbitrary structured payload — shape depends on `type`. */
  data: Record<string, unknown>;
  createdAt: Date;
}

export interface NotificationChannel {
  name: string;
  /** Channels should not throw — swallow/log their own delivery errors so
   * one failing channel never breaks the business operation that
   * triggered it. `NotificationService.dispatch` also guards this via
   * Promise.allSettled, but well-behaved channels handle it internally too. */
  send(event: NotificationEvent): Promise<void>;
}
