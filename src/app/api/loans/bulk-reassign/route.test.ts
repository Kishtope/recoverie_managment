import { beforeEach, expect, mock, test } from "bun:test";
import { NextResponse } from "next/server";

// Fakes: the new agent a2; L1 held by a1, L2 already held by a2, L3 closed. L4 is outside the caller's scope (not returned).
let role = "MANAGER";
let agentFound = true;
let pendingFor: string | null = null;
const moved: string[] = [];
const audits: { action: string; meta: unknown }[] = [];

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) => (roles && !roles.includes(role) ? { error: NextResponse.json({ error: "no" }, { status: 403 }) } : { user: { id: "m1", role } }),
  loanScopeWhere: () => ({}),
  userScopeWhere: () => ({}),
}));
mock.module("@/lib/audit", () => ({ logAudit: async (_u: string, action: string, _e: string, _id: unknown, meta: unknown) => void audits.push({ action, meta }) }));
mock.module("@/lib/reassign-case", () => ({ moveCase: async (_tx: unknown, a: { loanId: string }) => void moved.push(a.loanId) }));
mock.module("@/lib/telephony/pending", () => ({ findPendingCall: async (_db: unknown, agentId: string) => (pendingFor === agentId ? { id: "c" } : null) }));
mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: async () => (agentFound ? { id: "a2", name: "Ravi", agencyId: null } : null) },
    loan: {
      findMany: async () => [
        { id: "L1", status: "ACTIVE", allocations: [{ id: "x1", agentId: "a1" }] },
        { id: "L2", status: "ACTIVE", allocations: [{ id: "x2", agentId: "a2" }] },
        { id: "L3", status: "CLOSED", allocations: [] },
      ],
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));
const { POST } = await import("./route");

const post = async (body: unknown) => (await POST(new Request("http://x/api/loans/bulk-reassign", { method: "POST", body: JSON.stringify(body) }))) as Response;

beforeEach(() => {
  role = "MANAGER";
  agentFound = true;
  pendingFor = null;
  moved.length = 0;
  audits.length = 0;
});

test("an agent cannot bulk reassign (403) and an empty selection is a 400", async () => {
  role = "AGENT";
  expect((await post({ loanIds: ["L1"], agentId: "a2" })).status).toBe(403);
  role = "MANAGER";
  expect((await post({ loanIds: [], agentId: "a2" })).status).toBe(400);
});

test("an agent outside the caller's team is a 400 and nothing moves", async () => {
  agentFound = false;
  expect((await post({ loanIds: ["L1"], agentId: "a2" })).status).toBe(400);
  expect(moved).toHaveLength(0);
});

test("cases that cannot move are skipped with a reason; the rest move and the batch is audited once", async () => {
  const body = await (await post({ loanIds: ["L1", "L2", "L3", "L4"], agentId: "a2" })).json();
  expect(body.moved).toBe(1);
  expect(moved).toEqual(["L1"]);
  expect(Object.fromEntries(body.skipped.map((s: { loanId: string; reason: string }) => [s.loanId, s.reason]))).toEqual({
    L2: "Already allocated to Ravi",
    L3: "Loan is closed",
    L4: "Case not found",
  });
  expect(audits).toEqual([expect.objectContaining({ action: "loan.bulk_reassign" })]);
});

test("a case whose agent still owes a call outcome is skipped", async () => {
  pendingFor = "a1";
  const body = await (await post({ loanIds: ["L1"], agentId: "a2" })).json();
  expect(body.moved).toBe(0);
  expect(body.skipped[0].reason).toContain("call outcome");
});
