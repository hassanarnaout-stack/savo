/**
 * PaymentService — Phase 4.5 (Production Hardening)
 *
 * Checkout depends on THIS interface, not on any specific gateway's SDK
 * or logic. Today only Cash on Delivery actually "processes" (there's
 * nothing to charge — payment happens physically on delivery). KNET,
 * Visa, MasterCard, and Apple Pay are wired as real strategy slots with
 * the correct shape/contract, but throw NOT_IMPLEMENTED until a real
 * gateway is integrated — this is intentional per Phase 4.5's brief
 * ("لا تربط بوابة دفع الآن").
 *
 * To activate a real gateway later:
 *   1. Implement the PaymentProvider interface for it (e.g. KnetProvider)
 *   2. Register it in `providers` below
 *   3. No other file needs to change — checkout calls
 *      PaymentService.initiatePayment(...) exactly the same way regardless
 *      of which provider ends up handling it.
 */

export type PaymentMethod = "COD" | "KNET" | "CARD" | "VISA" | "MASTERCARD" | "APPLE_PAY";

export interface PaymentInitiationParams {
  orderId: string;
  orderNumber: string;
  amount: number; // KWD
  currency: "KWD";
  customerEmail: string;
  returnUrl: string; // where the gateway should redirect back to after payment
}

export interface PaymentInitiationResult {
  /** COD: immediately "successful" (nothing to charge). Gateways: a redirect URL to send the customer to. */
  status: "AWAITING_DELIVERY" | "REDIRECT_REQUIRED" | "FAILED";
  redirectUrl?: string;
  /** Opaque reference the gateway gives us, to reconcile with their webhook/callback later. */
  providerReference?: string;
  error?: string;
}

export interface PaymentProvider {
  method: PaymentMethod;
  isAvailable(): boolean;
  initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult>;
}

/** Always available — no external dependency, nothing to charge upfront. */
class CashOnDeliveryProvider implements PaymentProvider {
  method: PaymentMethod = "COD";
  isAvailable() {
    return true;
  }
  async initiatePayment(): Promise<PaymentInitiationResult> {
    return { status: "AWAITING_DELIVERY" };
  }
}

/**
 * Stub gateway provider — shared shape for KNET/Visa/MasterCard/Apple Pay.
 * `isAvailable()` returns false until the matching env var is set, so the
 * checkout UI can hide/disable these options honestly instead of
 * pretending they work.
 */
class StubGatewayProvider implements PaymentProvider {
  constructor(public method: PaymentMethod, private envVar: string) {}

  isAvailable() {
    return !!process.env[this.envVar];
  }

  async initiatePayment(): Promise<PaymentInitiationResult> {
    return {
      status: "FAILED",
      error: `${this.method} is not yet connected to a live payment gateway. Set ${this.envVar} and implement a real provider to enable it.`,
    };
  }
}

const providers: PaymentProvider[] = [
  new CashOnDeliveryProvider(),
  new StubGatewayProvider("KNET", "KNET_MERCHANT_ID"),
  new StubGatewayProvider("CARD", "CARD_GATEWAY_API_KEY"), // today's generic "Credit/Debit Card" checkout option
  new StubGatewayProvider("VISA", "CARD_GATEWAY_API_KEY"), // future: network-specific routing once needed
  new StubGatewayProvider("MASTERCARD", "CARD_GATEWAY_API_KEY"),
  new StubGatewayProvider("APPLE_PAY", "APPLE_PAY_MERCHANT_ID"),
];

export const PaymentService = {
  /** What the checkout UI should actually offer right now. */
  getAvailableMethods(): PaymentMethod[] {
    return providers.filter((p) => p.isAvailable()).map((p) => p.method);
  },

  async initiatePayment(method: PaymentMethod, params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    const provider = providers.find((p) => p.method === method);
    if (!provider) {
      return { status: "FAILED", error: `Unknown payment method: ${method}` };
    }
    if (!provider.isAvailable()) {
      return { status: "FAILED", error: `${method} is not currently available.` };
    }
    return provider.initiatePayment(params);
  },

  // -------------------------------------------------------------------
  // Financial Core (Phase 6.1) — every payment attempt is now tracked
  // in PaymentTransaction, not just implied by Order.paymentMethod.
  // -------------------------------------------------------------------

  /** Called from checkout right after initiatePayment() succeeds — records the attempt and maps the gateway result onto a transaction status. */
  async createPayment(params: { orderId: string; method: PaymentMethod; amount: number; initiationResult: PaymentInitiationResult }) {
    const { prisma } = await import("@/lib/prisma");
    const status = params.initiationResult.status === "AWAITING_DELIVERY" ? "AUTHORIZED" // COD — authorized now, actually collected on delivery
      : params.initiationResult.status === "REDIRECT_REQUIRED" ? "PENDING" // gateway — awaiting the customer to complete payment there
      : "FAILED";

    return prisma.paymentTransaction.create({
      data: {
        orderId: params.orderId,
        method: params.method,
        amount: params.amount,
        status,
        gatewayReference: params.initiationResult.providerReference,
      },
    });
  },

  /** Stub — real gateways will call this from a webhook/callback route to confirm a PENDING transaction actually went through. */
  async verifyPayment(transactionId: string): Promise<{ verified: boolean }> {
    const { prisma } = await import("@/lib/prisma");
    const txn = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId } });
    // No live gateway is connected yet (per Phase 4.5/6.1 brief) — nothing to verify against.
    // AUTHORIZED (COD) transactions are the only ones we can honestly confirm today, at delivery time (see markPaidOnDelivery).
    return { verified: txn.status === "PAID" };
  },

  /** Marks a transaction PAID — for COD, called at the moment the order is actually delivered (see supplier-orders.ts); for gateways, would be called from capturePayment() after a successful capture call. */
  async markPaidOnDelivery(orderId: string) {
    const { prisma } = await import("@/lib/prisma");
    await prisma.paymentTransaction.updateMany({
      where: { orderId, status: "AUTHORIZED" },
      data: { status: "PAID" },
    });
  },

  /** Stub — captures a previously-authorized card payment. Throws until a real gateway is wired, same honesty pattern as StubGatewayProvider. */
  async capturePayment(transactionId: string): Promise<{ success: boolean; error?: string }> {
    const { prisma } = await import("@/lib/prisma");
    const txn = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: transactionId } });
    if (txn.method === "COD") {
      return { success: false, error: "COD has nothing to capture — it's collected physically on delivery." };
    }
    return { success: false, error: `${txn.method} capture requires a live gateway integration, not yet connected.` };
  },

  /** Real refund bookkeeping (ties into the Refund Engine, §6.3) — marks the transaction REFUNDED. Actual money movement back to the customer's card/KNET still requires a live gateway; COD refunds are handled as store credit/wallet adjustments instead. */
  async refundPayment(transactionId: string, amount?: number): Promise<{ success: boolean }> {
    const { prisma } = await import("@/lib/prisma");
    await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: { status: "REFUNDED" },
    });
    return { success: true };
  },
};
