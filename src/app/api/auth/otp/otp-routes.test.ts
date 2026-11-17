import { afterEach, beforeEach, expect, mock, setSystemTime, test } from "bun:test";

process.env.JWT_ACCESS_SECRET = "test-secret";

type Row = { id: string; mobile: string; userId: string | null; codeHash: string; expiresAt: Date; attempts: number; consumedAt: Date | null; createdAt: Date };
type User = { id: string; name: string; email: string | null; mobile: string; role: string; status: string; lastLoginAt: Date | null };

// In-memory stand-ins for the OtpCode and User tables, the SMS provider, the session and the audit log.
let rows: Row[] = [];
let users: User[] = [];
let sent: { to: string; text: string }[] = [];
let sessions: string[] = [];
let audited: string[] = [];
let devVisible = true;

const matches = (row: Row, where: Record<string, unknown>) =>
  Object.entries(where).every(([k, v]) => {
    const value = row[k as keyof Row];
    if (v === null) return value === null;
    if (v && typeof v === "object" && "lt" in v) return (value as Date) < (v.lt as Date);
    if (v && typeof v === "object" && "gte" in v) return (value as Date) >= (v.gte as Date);
    return value === v;
  });

mock.module("@/lib/prisma", () => ({
  prisma: {
    otpCode: {
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => void (rows = rows.filter((r) => !matches(r, where))),
      findMany: async ({ where }: { where: Record<string, unknown> }) => rows.filter((r) => matches(r, where)),
      findFirst: async ({ where }: { where: Record<string, unknown> }) => rows.filter((r) => matches(r, where)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
      update: async ({ where, data }: { where: { id: string }; data: { attempts: { increment: number } } }) => {
        const r = rows.find((x) => x.id === where.id)!;
        r.attempts += data.attempts.increment;
        return r;
      },
      create: async ({ data }: { data: Omit<Row, "id" | "attempts" | "consumedAt" | "createdAt"> }) => {
        const r: Row = { id: `o${rows.length + 1}`, attempts: 0, consumedAt: null, createdAt: new Date(), ...data };
        rows.push(r);
        return r;
      },
    },
    user: {
      findFirst: async ({ where }: { where: Partial<User> }) => users.find((u) => Object.entries(where).every(([k, v]) => u[k as keyof User] === v)) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<User> }) => Object.assign(users.find((u) => u.id === where.id)!, data),
    },
  },
}));
mock.module("@/lib/sms", () => ({
  getSmsProvider: () => ({ name: "MOCK", send: async (m: { to: string; text: string }) => void sent.push(m) }),
  devSmsCodeVisible: () => devVisible,
}));
mock.module("@/lib/session", () => ({ startSession: async (u: { id: string }) => void sessions.push(u.id) }));
mock.module("@/lib/audit", () => ({ logAudit: async (_u: string, action: string) => void audited.push(action) }));

const request = (await import("./request/route")).POST;
const verify = (await import("./verify/route")).POST;

const post = async (handler: (req: Request) => Promise<Response>, body: unknown) => (await handler(new Request("http://x", { method: "POST", body: JSON.stringify(body) }))) as Response;
const askCode = (mobile: string) => post(request, { mobile });
const sendCode = (mobile: string, code: string) => post(verify, { mobile, code });
// The 6-digit code from the text the fake SMS provider last received.
const lastCode = () => /(\d{6})/.exec(sent[sent.length - 1].text)![1];

const AGENT = "9000000003";
beforeEach(() => {
  rows = [];
  sent = [];
  sessions = [];
  audited = [];
  devVisible = true;
  users = [
    { id: "a1", name: "Asha", email: "a@x.com", mobile: AGENT, role: "AGENT", status: "ACTIVE", lastLoginAt: null },
    { id: "m1", name: "Meera", email: "m@x.com", mobile: "9000000001", role: "MANAGER", status: "ACTIVE", lastLoginAt: null },
    { id: "a9", name: "Gone", email: "g@x.com", mobile: "9000000009", role: "AGENT", status: "DISABLED", lastLoginAt: null },
  ];
  setSystemTime(new Date("2026-11-17T10:00:00Z"));
});
afterEach(() => setSystemTime());

// Moves the clock forward so the 60 second resend cooldown has passed.
const wait = (seconds: number) => setSystemTime(new Date(Date.now() + seconds * 1000));

test("an unknown mobile, a manager, a disabled agent and a real agent all get the same answer; only the real agent gets a text", async () => {
  const answers = [];
  for (const mobile of ["9111111111", "9000000001", "9000000009", AGENT]) {
    const res = await askCode(mobile);
    expect(res.status).toBe(200);
    answers.push(await res.json());
  }
  for (const a of answers) expect(a).toMatchObject({ sent: true, resendAfterSec: 60 });
  expect(answers.map((a) => "devCode" in a)).toEqual([false, false, false, true]);
  expect(sent).toHaveLength(1);
  expect(sent[0].to).toBe(AGENT);
  expect(sent[0].text).not.toContain("devCode");
});

test("the code is only returned in the response when the dev switch is on (never in production)", async () => {
  devVisible = false;
  expect("devCode" in (await (await askCode(AGENT)).json())).toBe(false);
});

test("a bad mobile is a 400; asking again inside a minute is 429; the 6th code in an hour is refused", async () => {
  expect((await askCode("123")).status).toBe(400);
  expect((await askCode(AGENT)).status).toBe(200);
  expect((await askCode(AGENT)).status).toBe(429); // cooldown
  for (let i = 0; i < 4; i++) {
    wait(61);
    expect((await askCode(AGENT)).status).toBe(200);
  }
  wait(61);
  const sixth = await askCode(AGENT);
  expect(sixth.status).toBe(429);
  expect((await sixth.json()).error).toBe("Too many codes requested. Try again later.");
  expect(sent).toHaveLength(5);
});

test("the limits apply the same way to a mobile nobody owns (no hint which numbers are real)", async () => {
  expect((await askCode("9111111111")).status).toBe(200);
  expect((await askCode("9111111111")).status).toBe(429);
});

test("the right code signs the agent in once: session, last login and audit; reusing it fails", async () => {
  await askCode(AGENT);
  const code = lastCode();
  const ok = await sendCode(AGENT, code);
  expect(ok.status).toBe(200);
  expect(sessions).toEqual(["a1"]);
  expect(users[0].lastLoginAt).not.toBeNull();
  expect(audited).toEqual(["auth.otp_login"]);
  expect((await sendCode(AGENT, code)).status).toBe(401);
  expect(sessions).toHaveLength(1);
});

test("every kind of failure is the same 401 message and never starts a session", async () => {
  await askCode(AGENT);
  const wrong = await sendCode(AGENT, "000000");
  expect(wrong.status).toBe(401);
  const message = (await wrong.json()).error;
  expect((await sendCode("9111111111", "123456")).status).toBe(401); // never asked for a code
  expect((await (await sendCode("9111111111", "123456")).json()).error).toBe(message);
  expect((await sendCode(AGENT, "12")).status).toBe(400); // malformed input is a plain validation error
  expect(sessions).toHaveLength(0);
});

test("a manager's mobile can never sign in this way, even with a code row that matches", async () => {
  const { hashCode } = await import("@/lib/otp");
  rows.push({ id: "x", mobile: "9000000001", userId: null, codeHash: hashCode("123456"), expiresAt: new Date(Date.now() + 60_000), attempts: 0, consumedAt: null, createdAt: new Date() });
  expect((await sendCode("9000000001", "123456")).status).toBe(401);
  expect(sessions).toHaveLength(0);
});

test("after 5 wrong guesses the right code no longer works", async () => {
  await askCode(AGENT);
  const code = lastCode();
  for (let i = 0; i < 5; i++) expect((await sendCode(AGENT, "000000")).status).toBe(401);
  expect((await sendCode(AGENT, code)).status).toBe(401);
  expect(sessions).toHaveLength(0);
});

test("a code expires after 5 minutes", async () => {
  await askCode(AGENT);
  const code = lastCode();
  wait(301);
  expect((await sendCode(AGENT, code)).status).toBe(401);
});

test("asking for a new code cancels the old one", async () => {
  await askCode(AGENT);
  const first = lastCode();
  wait(61);
  await askCode(AGENT);
  const second = lastCode();
  expect((await sendCode(AGENT, first)).status).toBe(401);
  expect((await sendCode(AGENT, second)).status).toBe(200);
});
