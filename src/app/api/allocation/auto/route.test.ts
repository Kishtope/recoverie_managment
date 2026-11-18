import { beforeEach, expect, mock, test } from "bun:test";
import { NextResponse } from "next/server";

// Fakes for the signed-in user and the database: two agents and three unassigned loans.
let role = "ADMIN";
const created: { loanId: string; agentId: string }[] = [];
const audits: string[] = [];

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) => (roles && !roles.includes(role) ? { error: NextResponse.json({ error: "no" }, { status: 403 }) } : { user: { id: "u1", role } }),
  loanScopeWhere: () => ({}),
  userScopeWhere: () => ({}),
}));
mock.module("@/lib/audit", () => ({ logAudit: async (_u: string, action: string) => void audits.push(action) }));
mock.module("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: async () => [
        { id: "a1", name: "Asha", agencyId: null, access: [], _count: { allocations: 0 } },
        { id: "a2", name: "Ravi", agencyId: null, access: [], _count: { allocations: 0 } },
      ],
    },
    loan: {
      findMany: async () => [
        { id: "L1", dpd: 100, overdueAmount: { toNumber: () => 5000 }, company: "AF", branch: "Balaghat" },
        { id: "L2", dpd: 40, overdueAmount: { toNumber: () => 3000 }, company: "AF", branch: "Balaghat" },
        { id: "L3", dpd: 5, overdueAmount: null, company: "AF", branch: "Balaghat" },
      ],
      count: async () => 3,
    },
    allocation: { createMany: async ({ data }: { data: { loanId: string; agentId: string }[] }) => (created.push(...data), { count: data.length }) },
    notification: { createMany: async ({ data }: { data: unknown[] }) => ({ count: data.length }) },
  },
}));
const { POST } = await import("./route");

const post = async (body: unknown) => (await POST(new Request("http://x/api/allocation/auto", { method: "POST", body: JSON.stringify(body) }))) as Response;

beforeEach(() => {
  role = "ADMIN";
  created.length = 0;
  audits.length = 0;
});

test("agents and agency owners cannot run the engine (403)", async () => {
  role = "AGENT";
  expect((await post({ rule: "EQUAL", agentIds: ["a1"] })).status).toBe(403);
});

test("a bad body is a 400", async () => {
  expect((await post({ rule: "RANDOM", agentIds: ["a1"] })).status).toBe(400);
  expect((await post({ rule: "EQUAL", agentIds: [] })).status).toBe(400);
});

test("a dry run returns the plan and saves nothing", async () => {
  const body = await (await post({ rule: "EQUAL", agentIds: ["a1", "a2"], dryRun: true })).json();
  expect(body).toMatchObject({ dryRun: true, totalUnassigned: 3, assigned: 3, unassigned: 0 });
  expect(body.people.reduce((n: number, p: { cases: number }) => n + p.cases, 0)).toBe(3);
  expect(created).toHaveLength(0);
  expect(audits).toHaveLength(0);
});

test("a real run saves one allocation per case and audits it", async () => {
  const body = await (await post({ rule: "EQUAL", agentIds: ["a1", "a2"] })).json();
  expect(body).toMatchObject({ dryRun: false, assigned: 3, unassigned: 0 });
  expect(created.map((c) => c.loanId).sort()).toEqual(["L1", "L2", "L3"]);
  expect(audits).toEqual(["allocation.auto"]);
});
