import { beforeEach, expect, mock, test } from "bun:test";
import { NextResponse } from "next/server";

// Fakes: the signed-in user, a user lookup that finds the caller inside scope or not, and the AgentTarget table.
let role = "MANAGER";
let personFound = true;
const upserts: unknown[] = [];
const deletes: unknown[] = [];
const audits: string[] = [];

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) => (roles && !roles.includes(role) ? { error: NextResponse.json({ error: "no" }, { status: 403 }) } : { user: { id: "m1", role } }),
  userScopeWhere: () => ({}),
}));
mock.module("@/lib/audit", () => ({ logAudit: async (_u: string, action: string) => void audits.push(action) }));
mock.module("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: async () => (personFound ? { id: "a1" } : null) },
    agentTarget: { upsert: async (args: unknown) => void upserts.push(args), deleteMany: async (args: unknown) => void deletes.push(args) },
  },
}));
const { PUT } = await import("./route");

const put = async (body: unknown) => (await PUT(new Request("http://x/api/targets", { method: "PUT", body: JSON.stringify(body) }))) as Response;
const valid = { userId: "a1", month: "2026-11", collectionAmount: 250000, casesResolved: 12 };

beforeEach(() => {
  role = "MANAGER";
  personFound = true;
  upserts.length = deletes.length = audits.length = 0;
});

test("agents and agency owners cannot set targets (403)", async () => {
  role = "AGENT";
  expect((await put(valid)).status).toBe(403);
  role = "AGENCY_OWNER";
  expect((await put(valid)).status).toBe(403);
});

test("bad months, negative amounts and fractional case counts are 400", async () => {
  expect((await put({ ...valid, month: "2026-13" })).status).toBe(400);
  expect((await put({ ...valid, collectionAmount: -1 })).status).toBe(400);
  expect((await put({ ...valid, casesResolved: 2.5 })).status).toBe(400);
  expect(upserts).toHaveLength(0);
});

test("a caller outside the Manager's scope is a 400 and nothing is saved", async () => {
  personFound = false;
  expect((await put(valid)).status).toBe(400);
  expect(upserts).toHaveLength(0);
});

test("a target is saved and audited; clearing both goals removes it", async () => {
  expect((await put(valid)).status).toBe(200);
  expect(upserts).toHaveLength(1);
  expect(audits).toEqual(["target.set"]);
  expect((await put({ ...valid, collectionAmount: null, casesResolved: null })).status).toBe(200);
  expect(deletes).toEqual([{ where: { userId: "a1", month: "2026-11" } }]);
});
