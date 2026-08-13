import { createHmac, timingSafeEqual, randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * MobileAuthService — Phase 6.12, extended in Phase 7.6
 *
 * Access tokens: unchanged HMAC-SHA256 scheme (no new dependency), but
 * now SHORT-lived (15 min) instead of 30 days.
 *
 * Refresh tokens: a random 32-byte token, returned to the client once
 * and NEVER stored in plaintext — only its SHA-256 hash lives in
 * MobileRefreshToken. Every refresh ROTATES the token (the old one is
 * revoked, a new one issued) — standard rotation-based refresh security.
 */
const SECRET = process.env.AUTH_SECRET ?? "";
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface MobileTokenPayload {
  userId: string;
  role: string;
  exp: number;
}

export interface MobileTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class MobileAuthService {
  static issueAccessToken(userId: string, role: string): string {
    const payload: MobileTokenPayload = { userId, role, exp: Date.now() + ACCESS_TOKEN_TTL_MS };
    const payloadB64 = base64url(JSON.stringify(payload));
    const signature = createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
    return `${payloadB64}.${signature}`;
  }

  static verifyToken(token: string): MobileTokenPayload | null {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expectedSignature = createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

    try {
      const payload: MobileTokenPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
      if (payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  static verifyRequest(req: Request): MobileTokenPayload | null {
    const header = req.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) return null;
    return this.verifyToken(header.slice(7));
  }

  static async issueTokenPair(userId: string, role: string, deviceInfo?: string): Promise<MobileTokenPair> {
    const accessToken = this.issueAccessToken(userId, role);
    const refreshToken = randomBytes(32).toString("base64url");

    await prisma.mobileRefreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        deviceInfo,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_MS / 1000 };
  }

  static async refreshTokenPair(refreshToken: string): Promise<MobileTokenPair | null> {
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.mobileRefreshToken.findUnique({ where: { tokenHash }, include: { user: { select: { role: true } } } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) return null;

    await prisma.mobileRefreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokenPair(stored.userId, stored.user.role, stored.deviceInfo ?? undefined);
  }

  static async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await prisma.mobileRefreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
