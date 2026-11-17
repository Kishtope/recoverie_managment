import { beforeEach, expect, mock, test } from "bun:test";

// Fakes: the signed-in manager, the case, the chosen agent, pending calls, and a log of what the transaction wrote.
let loan: unknown;
let agent: unknown;
let pending: unknown;
const writes: string[] = [];
const notified: Record<string, unknown>[] = [];
const audited: unknown[][] = [];

mock.module("@/lib/auth", () => ({
  requireUser: async () => ({ user: { id: "mgr1", role: "MANAGER" } }),
  loanScopeWhere: () => ({}),
  userScopeWhere: () => ({}),
}));
mock.module("@/lib/audit", () => ({ logAudit: async (...args: unknown[]) => void audited.push(args) }));
const tx = {
  allocation: {
    update: async ({ data }: { data: Record<string, unknown> }) => void writes.push(`close:${data.active}:${data.activeLoanId}`),
    create: async ({ data }: { data: Record<string, unknown> }) => void writes.push(`open:${data.agentId}:${data.activeLoanId}`),
  },
  notification: { createMany: async ({ data }: { data: Record<string, unknown>[] }) => (notified.push(...data), { count: data.length }) },
};
mock.module("@/lib/prisma", () => ({
  prisma: {
    loan: { findFirst: async () => loan },
    user: { findFirst: async () => agent },
    call: { findFirst: async () => pending },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}));
const { POST } = await import("./route");

const reassign = async (body: unknown = { agentId: "agentB" }) =>
  (await POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "L1" }) })) as Response;

beforeEach(() => {
  loan = { status: "ACTIVE", allocations: [{ id: "alloc1", agentId: "agentA" }] };
  agent = { id: "agentB", name: "Arun Agent", agencyId: null };
  pending = null;
  writes.length = 0;
  notified.length = 0;
  audited.length = 0;
});

test("a case outside the caller's scope is a 404", async () => {
  loan = null;
  expect((await reassign()).status).toBe(404);
});

test("an agent outside the caller's team is refused (400) and nothing is written", async () => {
  agent = null;
  expect((await reassign()).status).toBe(400);
  expect(writes).toHaveLength(0);
});

test("a closed loan is 409", async () => {
  loan = { status: "CLOSED", allocations: [] };
  expect((await reassign()).status).toBe(409);
});

test("moving a case to the agent who already holds it is 409", async () => {
  agent = { id: "agentA", name: "Asha Agent", agencyId: null };
  expect((await reassign({ agentId: "agentA" })).status).toBe(409);
});

test("the current agent still owing a call outcome blocks the move (409)", async () => {
  pending = { id: "call1", loanId: "L1", status: "CONNECTED", startedAt: new Date(), loan: null };
  const res = await reassign();
  expect(res.status).toBe(409);
  expect(writes).toHaveLength(0);
});

test("success closes the old allocation, opens exactly one new active one, notifies the new agent and audits it", async () => {
  const res = await reassign();
  expect(res.status).toBe(200);
  expect(writes).toEqual(["close:false:null", "open:agentB:L1"]);
  expect(notified[0]).toMatchObject({ userId: "agentB", type: "REASSIGNED", entityId: "L1" });
  expect(audited[0].slice(1, 5)).toEqual(["loan.reassign", "Loan", "L1", { from: "agentA", to: "agentB" }]);
});
