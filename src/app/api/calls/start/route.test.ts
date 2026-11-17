import { afterEach, beforeEach, expect, mock, setSystemTime, test } from "bun:test";
import { NextResponse } from "next/server";

// Fakes for the two things the route talks to: the signed-in user and the database.
let auth: { user?: { id: string; role: string }; error?: Response } = { user: { id: "agent1", role: "AGENT" } };
let loan: unknown = { status: "ACTIVE", customer: { mobilePrimary: "9800000001", mobileAlt: null } };
let pending: unknown = null;
let agentMobile: string | null = "9000000003";
const created: unknown[] = [];

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) => {
    if (auth.error) return { error: auth.error };
    if (roles && !roles.includes((auth.user as { role: string }).role)) return { error: NextResponse.json({ error: "no" }, { status: 403 }) };
    return { user: auth.user };
  },
  loanScopeWhere: () => ({}),
}));
mock.module("@/lib/prisma", () => ({
  prisma: {
    loan: { findFirst: async () => loan },
    call: {
      findFirst: async () => pending,
      create: async ({ data }: { data: unknown }) => (created.push(data), { id: "call1" }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "call1", provider: "MOCK", direction: "OUTBOUND", status: "INITIATED", startedAt: new Date(), answeredAt: null, endedAt: null,
        durationSec: null, numberSlot: "primary", customerNumberMask: "98XXXXXX01", recordingUrl: null, failureReason: null,
        callbackResolvedAt: null, loanId: "L1", loan: null, agent: null, disposition: null, ...data,
      }),
      updateMany: async () => ({ count: 0 }),
    },
    user: { findUnique: async () => ({ mobile: agentMobile }) },
    appSetting: { findUnique: async () => null },
  },
}));
const { POST } = await import("./route");

const post = async (body: unknown = { loanId: "L1", numberSlot: "primary" }) =>
  (await POST(new Request("http://x/api/calls/start", { method: "POST", body: JSON.stringify(body) }))) as Response;

beforeEach(() => {
  auth = { user: { id: "agent1", role: "AGENT" } };
  loan = { status: "ACTIVE", customer: { mobilePrimary: "9800000001", mobileAlt: null } };
  pending = null;
  agentMobile = "9000000003";
  created.length = 0;
  setSystemTime(new Date("2026-11-17T06:00:00Z")); // 11:30 IST, inside the window
});
afterEach(() => setSystemTime());

test("a Manager cannot start a call (403)", async () => {
  auth = { user: { id: "m1", role: "MANAGER" } };
  expect((await post()).status).toBe(403);
});

test("outside 9 AM-7 PM IST is refused with 403 and no call is created", async () => {
  setSystemTime(new Date("2026-11-17T14:00:00Z")); // 19:30 IST
  const res = await post();
  expect(res.status).toBe(403);
  expect((await res.json()).error).toBe("Calls are allowed between 9 AM and 7 PM");
  expect(created).toHaveLength(0);
});

test("someone else's case (not in the agent's scope) is a 404", async () => {
  loan = null;
  expect((await post()).status).toBe(404);
});

test("a call still waiting for its outcome blocks the next call with 409 and points at that case", async () => {
  pending = { id: "old", loanId: "L9", status: "CONNECTED", startedAt: new Date(), loan: { customer: { name: "Customer 3" } } };
  const res = await post();
  expect(res.status).toBe(409);
  const body = await res.json();
  expect(body.error).toBe("Record the outcome of your call with Customer 3 first");
  expect(body.loanId).toBe("L9");
  expect(created).toHaveLength(0);
});

test("an agent without a mobile gets 400", async () => {
  agentMobile = null;
  expect((await post()).status).toBe(400);
});

test("happy path creates an INITIATED call and never returns the real number", async () => {
  const res = await post();
  expect(res.status).toBe(201);
  expect(JSON.stringify(await res.json())).not.toContain("9800000001");
  expect(created).toHaveLength(1);
});
