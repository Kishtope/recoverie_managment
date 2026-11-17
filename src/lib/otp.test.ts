import { expect, test } from "bun:test";
import { OTP_TTL_MS, canRequest, checkAttempt, codeMatchesHash, generateCode, hashCode } from "./otp";

const now = new Date("2026-11-17T10:00:00Z");
const at = (secondsAgo: number) => ({ createdAt: new Date(now.getTime() - secondsAgo * 1000) });
const record = (over: Partial<Parameters<typeof checkAttempt>[0]> = {}) => ({
  codeHash: hashCode("123456", "k"),
  expiresAt: new Date(now.getTime() + OTP_TTL_MS),
  attempts: 0,
  consumedAt: null,
  ...over,
});

test("codes are 6 digits and the stored hash is not the code", () => {
  for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  expect(hashCode("123456", "k")).not.toContain("123456");
  expect(codeMatchesHash("123456", hashCode("123456", "k"), "k")).toBe(true);
  expect(codeMatchesHash("123457", hashCode("123456", "k"), "k")).toBe(false);
  expect(codeMatchesHash("123456", hashCode("123456", "other-key"), "k")).toBe(false);
});

test("the right code is accepted, a wrong one is invalid", () => {
  expect(checkAttempt(record(), "123456", now, "k")).toBe("ok");
  expect(checkAttempt(record(), "000000", now, "k")).toBe("invalid");
});

test("after 5 wrong guesses even the right code is refused", () => {
  expect(checkAttempt(record({ attempts: 4 }), "123456", now, "k")).toBe("ok");
  expect(checkAttempt(record({ attempts: 5 }), "123456", now, "k")).toBe("locked");
});

test("a code expires after 5 minutes and works only once", () => {
  expect(checkAttempt(record({ expiresAt: new Date(now.getTime() - 1) }), "123456", now, "k")).toBe("expired");
  expect(checkAttempt(record({ expiresAt: new Date(now.getTime() + 1) }), "123456", now, "k")).toBe("ok");
  expect(checkAttempt(record({ consumedAt: new Date(now.getTime() - 1000) }), "123456", now, "k")).toBe("consumed");
});

test("resend: 60 second cooldown, then allowed", () => {
  expect(canRequest([], now)).toEqual({ ok: true });
  expect(canRequest([at(30)], now)).toEqual({ ok: false, reason: "cooldown", retryAfterSec: 30 });
  expect(canRequest([at(61)], now)).toEqual({ ok: true });
});

test("hourly limit: the 6th code in an hour is refused until the oldest ages out", () => {
  const five = [at(3500), at(2800), at(2100), at(1400), at(700)];
  const blocked = canRequest(five, now);
  expect(blocked).toMatchObject({ ok: false, reason: "limit" });
  expect((blocked as { retryAfterSec: number }).retryAfterSec).toBe(100); // oldest is 3500 s old, frees up at 3600 s
  expect(canRequest([at(3700), at(2800), at(2100), at(1400), at(700)], now)).toEqual({ ok: true });
});
