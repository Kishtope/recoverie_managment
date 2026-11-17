import { beforeEach, expect, mock, test } from "bun:test";
import { NextResponse } from "next/server";

let role = "MANAGER";
mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) =>
    roles && !roles.includes(role) ? { error: NextResponse.json({ error: "no" }, { status: 403 }) } : { user: { id: "u1", role, access: [], agencyId: null } },
  loanScopeWhere: () => ({}),
}));
mock.module("@/lib/prisma", () => ({ prisma: { loan: { findMany: async () => [] }, appSetting: { findUnique: async () => null } } }));
const { GET } = await import("./route");

const get = async (qs = "") => (await GET(new Request(`http://x/api/dashboard/summary${qs}`))) as Response;

beforeEach(() => {
  role = "MANAGER";
});

test("an agent cannot open the team dashboard (403); they have their own", async () => {
  role = "AGENT";
  expect((await get()).status).toBe(403);
});

test("a month outside the chosen financial year is a 400", async () => {
  expect((await get("?fy=2026-2027&month=2027-04")).status).toBe(400);
  expect((await get("?fy=2026-2027&month=2026-03")).status).toBe(400);
});

test("Manager, Agency owner and Admin get the numbers; a quiet period is all zeros with no collection %", async () => {
  for (const r of ["MANAGER", "AGENCY_OWNER", "ADMIN"]) {
    role = r;
    const res = await get("?fy=2026-2027&month=2026-11");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.period).toMatchObject({ from: "2026-11-01", to: "2026-11-30" });
    expect(body.summary).toMatchObject({ cases: 0, collected: 0, collectionPct: null });
  }
});
