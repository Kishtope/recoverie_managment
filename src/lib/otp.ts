import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MS = 5 * 60_000; // a code is valid for 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 60_000; // wait this long before asking for another code
export const OTP_HOURLY_LIMIT = 5; // codes per mobile per rolling hour
export const OTP_MAX_ATTEMPTS = 5; // wrong guesses before a code is dead

// A random 6-digit code ("004821" is valid, so leading zeros are kept).
export const generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

// Keyed hash of a code, so the database never holds the code itself. The key is the app secret; a leaked table cannot be reversed
// without it, and 6-digit codes cannot be brute-forced offline without the key.
export const hashCode = (code: string, secret: string = process.env.JWT_ACCESS_SECRET ?? "") => createHmac("sha256", secret).update(code).digest("hex");

// Constant-time comparison of a typed code against a stored hash.
export const codeMatchesHash = (code: string, hash: string, secret?: string) => {
  const a = Buffer.from(hashCode(code, secret));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
};

export type RequestCheck = { ok: true } | { ok: false; reason: "cooldown" | "limit"; retryAfterSec: number };

// May this mobile get another code now? `history` is the createdAt of the codes already requested for it (any order).
// Blocks inside the 60 s cooldown and after 5 codes in the last hour; retryAfterSec says when it will work again.
export const canRequest = (history: { createdAt: Date }[], now: Date): RequestCheck => {
  const times = history.map((h) => h.createdAt.getTime()).sort((a, b) => b - a);
  const last = times[0];
  if (last !== undefined && now.getTime() - last < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown", retryAfterSec: Math.ceil((last + OTP_RESEND_COOLDOWN_MS - now.getTime()) / 1000) };
  }
  const lastHour = times.filter((t) => now.getTime() - t < 3600_000);
  if (lastHour.length >= OTP_HOURLY_LIMIT) {
    const oldest = lastHour[lastHour.length - 1];
    return { ok: false, reason: "limit", retryAfterSec: Math.ceil((oldest + 3600_000 - now.getTime()) / 1000) };
  }
  return { ok: true };
};

export type AttemptResult = "ok" | "invalid" | "expired" | "locked" | "consumed";

// Judges one typed code against a stored one. Order matters: a used or expired code is never worth comparing, and after 5 wrong guesses
// even the right code is refused. The caller turns every non-"ok" result into the same message so nothing leaks.
export const checkAttempt = (
  record: { codeHash: string; expiresAt: Date; attempts: number; consumedAt: Date | null },
  code: string,
  now: Date,
  secret?: string,
): AttemptResult => {
  if (record.consumedAt) return "consumed";
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  if (record.attempts >= OTP_MAX_ATTEMPTS) return "locked";
  return codeMatchesHash(code, record.codeHash, secret) ? "ok" : "invalid";
};
