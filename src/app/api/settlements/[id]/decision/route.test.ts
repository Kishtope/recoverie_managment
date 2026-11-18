import { beforeEach, expect, mock, test } from "bun:test";
import { NextResponse } from "next/server";

// Fakes: one settlement; a Manager's limit is 20%. The overdue was 10,000: waiver 1,500 (15%) or 3,000 (30%).
let role = "MANAGER";
let settlement: { status: string; waiverAmount: { toNumber: () => number }; requestedAmount: { toNumber: () => number }; loanId: string } | null;
let updateCount = 1;
const updates: unknown[] = [];
const audits: string[] = [];

const settle = (waiver: number, status = "PENDING") => ({ status, waiverAmount: { toNumber: () => waiver }, requestedAmount: { toNumber: () => 10000 - waiver }, loanId: "L1" });

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) => (roles && !roles.includes(role) ? { error: NextResponse.json({ error: "no" }, { status: 403 }) } : { user: { id: "u1", role } }),
  loanScopeWhere: () => ({}),
}));
mock.module("@/lib/audit", () => ({ logAudit: async (_u: string, action: string) => void audits.push(action) }));
mock.module("@/lib/prisma", () => ({
  prisma: {
    appSetting: { findUnique: async () => null }, // default Manager limit: 20%
    settlement: {
      findFirst: async () => settlement,
      updateMany: async ({ data }: { data: unknown }) => (updates.push(data), { count: updateCount }),
    },
  },
}));
const { POST } = await import("./route");

const post = async (body: unknown) =>
  (await POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "S1" }) })) as Response;

beforeEach(() => {
  role = "MANAGER";
  settlement = settle(1500);
  updateCount = 1;
  updates.length = 0;
  audits.length = 0;
});

test("an agent cannot decide (403)", async () => {
  role = "AGENT";
  expect((await post({ decision: "APPROVED" })).status).toBe(403);
});

test("a Manager approves a waiver within the limit", async () => {
  expect((await post({ decision: "APPROVED", note: "ok" })).status).toBe(200);
  expect(updates).toEqual([expect.objectContaining({ status: "APPROVED", decisionNote: "ok" })]);
  expect(audits).toEqual(["settlement.approve"]);
});

test("a Manager cannot approve a waiver above the limit, but can reject it; an Admin can approve it", async () => {
  settlement = settle(3000);
  const res = await post({ decision: "APPROVED" });
  expect(res.status).toBe(403);
  expect((await res.json()).error).toContain("Admin");
  expect(updates).toHaveLength(0);
  expect((await post({ decision: "REJECTED" })).status).toBe(200);
  role = "ADMIN";
  expect((await post({ decision: "APPROVED" })).status).toBe(200);
});

test("an already decided request is a 409, also when two people decide at once", async () => {
  settlement = settle(1500, "APPROVED");
  expect((await post({ decision: "REJECTED" })).status).toBe(409);
  settlement = settle(1500);
  updateCount = 0; // someone else got there between the read and the write
  expect((await post({ decision: "APPROVED" })).status).toBe(409);
  expect(audits).toHaveLength(0);
});
