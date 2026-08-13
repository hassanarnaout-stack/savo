import NextAuth from "next-auth";
import type { UserRole, BrandAccount } from "@prisma/client";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { MysterySafeService } from "@/lib/services/mystery-safe-service";

const isProduction = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 days — shorter than the previous 30-day NextAuth default, more appropriate for a platform handling payment/address data
    updateAge: 24 * 60 * 60, // refresh the session token at most once per day of activity
  },
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax", // "lax" (not "strict") is intentional: KNET/payment-gateway style redirects back to the app need the session cookie present on that return navigation
        path: "/",
        secure: isProduction,
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;

        // Rate-limited per email, not per IP: this is what actually stops
        // someone from brute-forcing ONE account's password regardless of
        // how many IPs/proxies they rotate through.
        const rateLimit = checkRateLimit(`login:${email.toLowerCase()}`, RATE_LIMITS.LOGIN);
        if (!rateLimit.allowed) {
          logger.warn("Rate limit exceeded on login", { email });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        // Phase 5.2 — Mystery Safe daily key. Fire-and-forget: a failed
        // key grant must never block sign-in.
        MysterySafeService.grantKey(user.id, "LOGIN").catch(() => {});

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as UserRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});

/** Helper for server components/route handlers to enforce admin access. */
export async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Helper for supplier dashboard routes. Returns the session AND the
 * caller's Supplier record so route handlers don't need a second query.
 * Admins may also pass through (for support/impersonation use cases) but
 * must supply an explicit supplierId to act on.
 */
export async function requireSupplier() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || role !== "SUPPLIER") {
    throw new Error("UNAUTHORIZED");
  }
  const { prisma } = await import("@/lib/prisma");
  const supplier = await prisma.supplier.findUnique({
    where: { ownerUserId: session.user.id },
  });
  if (!supplier) throw new Error("NO_SUPPLIER_PROFILE");
  return { session, supplier };
}

/**
 * Single source of truth for "can this signed-in supplier reach the
 * (future) supplier dashboard right now" — used by every route under
 * /supplier/* to decide whether to render or redirect to the matching
 * status page (pending/rejected/suspended).
 *
 * Deliberately does NOT redirect itself — callers own the redirect so
 * status pages (e.g. /supplier/pending) can call this too without
 * causing a redirect loop back to themselves.
 */
export type SupplierGateResult =
  | { ok: true; reason: "VERIFIED"; supplier: NonNullable<Awaited<ReturnType<typeof requireSupplier>>>["supplier"] }
  | { ok: false; reason: "NOT_AUTHENTICATED" }
  | { ok: false; reason: "WRONG_ROLE"; role: string }
  | { ok: false; reason: "NO_SUPPLIER_PROFILE" }
  | { ok: false; reason: "PENDING"; supplier: NonNullable<Awaited<ReturnType<typeof requireSupplier>>>["supplier"] }
  | { ok: false; reason: "REJECTED"; supplier: NonNullable<Awaited<ReturnType<typeof requireSupplier>>>["supplier"] }
  | { ok: false; reason: "SUSPENDED"; supplier: NonNullable<Awaited<ReturnType<typeof requireSupplier>>>["supplier"] };

export async function getSupplierAccountGate(): Promise<SupplierGateResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, reason: "NOT_AUTHENTICATED" };
  if (session.user.role !== "SUPPLIER") return { ok: false, reason: "WRONG_ROLE", role: session.user.role };

  const { prisma } = await import("@/lib/prisma");
  const supplier = await prisma.supplier.findUnique({ where: { ownerUserId: session.user.id } });
  if (!supplier) return { ok: false, reason: "NO_SUPPLIER_PROFILE" };

  if (supplier.status === "SUSPENDED") return { ok: false, reason: "SUSPENDED", supplier };
  if (supplier.status === "REJECTED" || supplier.verificationStatus === "REJECTED") {
    return { ok: false, reason: "REJECTED", supplier };
  }
  if (supplier.verificationStatus !== "VERIFIED" || supplier.status !== "ACTIVE") {
    return { ok: false, reason: "PENDING", supplier };
  }
  return { ok: true, reason: "VERIFIED", supplier };
}

/**
 * Hard requirement for every Phase 3 Supplier Dashboard API route
 * (products, inventory, orders, sales). Throws unless the caller is an
 * authenticated, ACTIVE + VERIFIED supplier, and returns ONLY that
 * supplier's own record.
 *
 * SECURITY: route handlers must derive the supplier exclusively from this
 * function's return value (i.e. from session.user.id via the DB lookup
 * below) — never from a supplierId field in the request body/query, which
 * a malicious client could tamper with to target another supplier's data.
 */
export async function requireVerifiedSupplier() {
  const gate = await getSupplierAccountGate();
  if (!gate.ok) {
    throw new Error(`SUPPLIER_GATE_${gate.reason}`);
  }
  const session = await auth();
  return { session: session!, supplier: gate.supplier };
}

/**
 * Brand Center account gate (Phase 5.4) — same pattern as
 * getSupplierAccountGate above, adapted for BrandAccount's simpler
 * 3-state status (PENDING/ACTIVE/SUSPENDED, no separate verification step).
 */
export type BrandGateResult =
  | { ok: true; reason: "ACTIVE"; brand: BrandAccount }
  | { ok: false; reason: "NOT_AUTHENTICATED" }
  | { ok: false; reason: "WRONG_ROLE"; role: string }
  | { ok: false; reason: "NO_BRAND_PROFILE" }
  | { ok: false; reason: "PENDING"; brand: BrandAccount }
  | { ok: false; reason: "SUSPENDED"; brand: BrandAccount };

export async function getBrandAccountGate(): Promise<BrandGateResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, reason: "NOT_AUTHENTICATED" };
  if (session.user.role !== "BRAND") return { ok: false, reason: "WRONG_ROLE", role: session.user.role };

  const { prisma } = await import("@/lib/prisma");
  const brand = await prisma.brandAccount.findUnique({ where: { ownerUserId: session.user.id } });
  if (!brand) return { ok: false, reason: "NO_BRAND_PROFILE" };

  if (brand.status === "SUSPENDED") return { ok: false, reason: "SUSPENDED", brand };
  if (brand.status !== "ACTIVE") return { ok: false, reason: "PENDING", brand };
  return { ok: true, reason: "ACTIVE", brand };
}

/**
 * Hard requirement for every Brand Center API route. Throws unless the
 * caller is an authenticated, ACTIVE brand account, and returns ONLY
 * that brand's own record.
 *
 * SECURITY: route handlers must derive brandId exclusively from this
 * function's return value — never from a brandId field in the request
 * body/query, which a malicious client could tamper with to target
 * another brand's data (§16 requirement).
 */
export async function requireActiveBrand() {
  const gate = await getBrandAccountGate();
  if (!gate.ok) {
    throw new Error(`BRAND_GATE_${gate.reason}`);
  }
  const session = await auth();
  return { session: session!, brand: gate.brand };
}
