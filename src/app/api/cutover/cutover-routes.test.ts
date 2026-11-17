import { beforeEach, expect, mock, test } from "bun:test";
import { NextResponse } from "next/server";

let role = "ADMIN";
const audited: string[] = [];
const dbCalls: string[] = [];

const users = [
  { id: "u1", name: "Asha Agent", role: "AGENT", email: null, mobile: "9000000003", hubUserId: "HUB-1", lastLoginAt: new Date("2026-11-16T10:00:00Z"), status: "ACTIVE", _count: { allocations: 3 } },
  { id: "u2", name: "Arun Agent", role: "AGENT", email: null, mobile: null, hubUserId: null, lastLoginAt: null, status: "ACTIVE", _count: { allocations: 0 } },
  { id: "u3", name: "Meera Manager", role: "MANAGER", email: "m@x.com", mobile: null, hubUserId: null, lastLoginAt: new Date(), status: "ACTIVE", _count: { allocations: 0 } },
  { id: "u4", name: "Gone", role: "AGENT", email: null, mobile: "9444444444", hubUserId: null, lastLoginAt: null, status: "DISABLED", _count: { allocations: 0 } },
];

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) =>
    roles && !roles.includes(role) ? { error: NextResponse.json({ error: "no" }, { status: 403 }) } : { user: { id: "admin1", role } },
}));
mock.module("@/lib/audit", () => ({ logAudit: async (_u: string, action: string) => void audited.push(action) }));
// Only reads exist on this fake: any write the routes tried would throw, which proves they are read-only.
mock.module("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: async ({ where }: { where?: { status?: string } }) => {
        dbCalls.push("user.findMany");
        return users.filter((u) => !where?.status || u.status === where.status);
      },
    },
  },
}));
const readiness = (await import("./readiness/route")).GET;
const staffCheck = (await import("./staff-check/route")).POST;

const get = async (qs = "") => (await readiness(new Request(`http://x/api/cutover/readiness${qs}`))) as Response;
const upload = async (name: string, content: string) => {
  const form = new FormData();
  form.append("file", new File([content], name));
  return (await staffCheck(new Request("http://x", { method: "POST", body: form }))) as Response;
};

beforeEach(() => {
  role = "ADMIN";
  audited.length = 0;
  dbCalls.length = 0;
});

test("only an Admin may open either route (403)", async () => {
  role = "MANAGER";
  expect((await get()).status).toBe(403);
  expect((await upload("s.csv", "Name\nAsha")).status).toBe(403);
  role = "AGENT";
  expect((await get()).status).toBe(403);
  expect(dbCalls).toHaveLength(0);
});

test("readiness lists active users only, with the summary and masked mobiles", async () => {
  const body = await (await get()).json();
  expect(body.total).toBe(3); // the disabled user is not counted
  expect(body.summary).toMatchObject({ total: 3, ready: 2, notReady: 1, noMobile: 1, neverSignedIn: 1 });
  expect(JSON.stringify(body)).not.toContain("9000000003");
  expect(body.items.find((u: { id: string }) => u.id === "u1")).toMatchObject({ mobile: "90XXXXXX03", activeCases: 3, ready: true });
});

test("the Not ready filter keeps only users with a problem, and says what it is", async () => {
  const body = await (await get("?filter=not-ready")).json();
  expect(body.items).toHaveLength(1);
  expect(body.items[0]).toMatchObject({ id: "u2", ready: false, problems: ["No mobile number", "No hub user id", "Never signed in"] });
});

test("the CSV export has every filtered row, no full mobile numbers, and is audited", async () => {
  const res = await get("?format=csv");
  expect(res.headers.get("content-type")).toContain("text/csv");
  const text = await res.text();
  expect(text.split("\r\n").filter(Boolean)).toHaveLength(4); // header + 3 users
  expect(text).not.toContain("9000000003");
  expect(text).toContain("90XXXXXX03");
  expect(audited).toEqual(["cutover.export"]);
});

test("staff check: a missing file or Name column is a 400", async () => {
  expect(((await staffCheck(new Request("http://x", { method: "POST", body: new FormData() }))) as Response).status).toBe(400);
  expect((await upload("s.csv", "Mobile\n9000000003")).status).toBe(400);
  expect((await upload("s.txt", "Name\nAsha")).status).toBe(400);
});

test("staff check matches rows to users, reports the rest, and only reads", async () => {
  const csv = "Staff Name,Mobile,Role\nSomeone,09000000003,Agent\nArun Agent,,Agent\nNobody Here,9555555555,Agent\nGone,9444444444,Agent\n";
  const body = await (await upload("staff.csv", csv)).json();
  expect(body.summary).toEqual({ total: 4, matched: 2, noAccount: 1, disabled: 1, ambiguous: 0 });
  expect(body.items.map((i: { status: string }) => i.status)).toEqual(["matched", "matched", "no-account", "disabled"]);
  expect(JSON.stringify(body)).not.toContain("9000000003");
  expect(dbCalls).toEqual(["user.findMany"]); // one read, no writes
  expect(audited).toHaveLength(0);
});
