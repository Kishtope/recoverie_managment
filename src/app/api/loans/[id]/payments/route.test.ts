import { beforeEach, expect, mock, setSystemTime, test } from "bun:test";
import { NextResponse } from "next/server";

// Fakes: the signed-in user and a database where the loan lookup either finds the case or not.
let role = "AGENT";
let loanFound = true;
const scopes: string[] = [];
const created: { data: Record<string, unknown> }[] = [];
const audits: string[] = [];

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) => (roles && !roles.includes(role) ? { error: NextResponse.json({ error: "no" }, { status: 403 }) } : { user: { id: "u1", role } }),
  loanScopeWhere: () => ((scopes.push("scope"), {})),
  ownCaseWhere: () => ((scopes.push("own"), {})),
}));
mock.module("@/lib/audit", () => ({ logAudit: async (_u: string, action: string) => void audits.push(action) }));
mock.module("@/lib/prisma", () => ({
  prisma: {
    loan: { findFirst: async () => (loanFound ? { id: "L1" } : null) },
    payment: {
      create: async (args: { data: Record<string, unknown> }) => (created.push(args), { id: "P1", amount: { toNumber: () => 2500 }, paidOn: new Date("2026-11-17T00:00:00Z"), mode: args.data.mode, receiptNo: args.data.receiptNo, source: "MANUAL" }),
    },
  },
}));
const { POST } = await import("./route");

const post = async (body: unknown) =>
  (await POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "L1" }) })) as Response;
const valid = { amount: 2500, paidOn: "2026-11-17", mode: "UPI", reference: "UTR123" };

beforeEach(() => {
  role = "AGENT";
  loanFound = true;
  scopes.length = created.length = audits.length = 0;
  setSystemTime(new Date("2026-11-18T06:00:00Z")); // 18 Nov IST
});

test("a payment is saved with a receipt number, who collected it, and audited", async () => {
  const res = await post(valid);
  expect(res.status).toBe(201);
  const data = created[0].data;
  expect(data).toMatchObject({ loanId: "L1", amount: 2500, source: "MANUAL", collectedById: "u1", mode: "UPI · UTR123" });
  expect(String(data.receiptNo)).toMatch(/^RCP-20261118-/);
  expect(data.dedupeKey).toBe(`manual|${data.receiptNo}`);
  expect(audits).toEqual(["payment.create"]);
});

test("workers are limited to their own cases; supervisors use their scope", async () => {
  await post(valid);
  role = "MANAGER";
  await post(valid);
  expect(scopes).toEqual(["own", "scope"]);
});

test("bad amounts, future dates and unknown modes are 400 and save nothing", async () => {
  expect((await post({ ...valid, amount: 0 })).status).toBe(400);
  expect((await post({ ...valid, amount: -5 })).status).toBe(400);
  expect((await post({ ...valid, mode: "BARTER" })).status).toBe(400);
  expect((await post({ ...valid, paidOn: "2026-11-19" })).status).toBe(400); // tomorrow IST
  expect(created).toHaveLength(0);
});

test("a case outside the caller's scope is a 404", async () => {
  loanFound = false;
  expect((await post(valid)).status).toBe(404);
  expect(created).toHaveLength(0);
});
