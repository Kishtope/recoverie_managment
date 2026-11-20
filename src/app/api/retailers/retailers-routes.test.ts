import { beforeEach, expect, mock, test } from "bun:test";

// Fakes: the signed-in user, what the DB holds, and a log of what the routes wrote.
let role = "ADMIN";
let existing: { id: string; status: string } | null;
const writes: string[] = [];
const audited: unknown[][] = [];

const row = {
  id: "r1",
  code: "RT-001",
  name: "Sharma Mobiles",
  ownerName: "Ramesh",
  mobile: "9876543210",
  email: null,
  address: null,
  city: null,
  status: "ACTIVE",
  createdAt: new Date("2026-11-19T00:00:00Z"),
  _count: { customers: 0 },
};

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) => (roles && !roles.includes(role) ? { error: Response.json({ error: "no" }, { status: 403 }) } : { user: { id: "u1", role } }),
}));
mock.module("@/lib/audit", () => ({ logAudit: async (...args: unknown[]) => void audited.push(args) }));
mock.module("@/lib/prisma", () => ({
  prisma: {
    retailer: {
      findUnique: async () => existing,
      update: async ({ data }: { data: Record<string, unknown> }) => (writes.push(`update:${Object.keys(data).join(",")}`), { ...row, ...data }),
      findMany: async () => [row],
      count: async () => 1,
      groupBy: async () => [{ status: "ACTIVE", _count: { _all: 1 } }],
    },
  },
}));

const list = await import("./route");
const one = await import("./[id]/route");

const json = (body: unknown, method = "POST") => new Request("http://x", { method, body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "r1" }) };

beforeEach(() => {
  role = "ADMIN";
  existing = { id: "r1", status: "ACTIVE" };
  writes.length = 0;
  audited.length = 0;
});

test("every retailer route is Admin only", async () => {
  for (const r of ["MANAGER", "AGENCY_OWNER", "AGENT"]) {
    role = r;
    expect(((await list.GET(new Request("http://x"))) as Response).status).toBe(403);
    expect(((await one.PATCH(json({ status: "INACTIVE" }, "PATCH"), ctx)) as Response).status).toBe(403);
  }
  expect(writes).toEqual([]);
});

test("retailers cannot be created in the app: the list route has no POST", () => {
  expect("POST" in list).toBe(false);
});

test("editing: empty body is 400, unknown retailer 404, a status change is audited as retailer.status", async () => {
  expect(((await one.PATCH(json({}, "PATCH"), ctx)) as Response).status).toBe(400);
  existing = null;
  expect(((await one.PATCH(json({ name: "New name" }, "PATCH"), ctx)) as Response).status).toBe(404);
  existing = { id: "r1", status: "ACTIVE" };
  const res = (await one.PATCH(json({ status: "INACTIVE" }, "PATCH"), ctx)) as Response;
  expect(res.status).toBe(200);
  expect(audited.at(-1)?.[1]).toBe("retailer.status");
});
