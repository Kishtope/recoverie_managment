import { beforeEach, expect, mock, test } from "bun:test";
import { NextResponse } from "next/server";

let role = "ADMIN";
const stored = new Map<string, unknown>();
const audited: unknown[][] = [];

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) =>
    roles && !roles.includes(role) ? { error: NextResponse.json({ error: "no" }, { status: 403 }) } : { user: { id: "admin1", role } },
}));
mock.module("@/lib/audit", () => ({ logAudit: async (...args: unknown[]) => void audited.push(args) }));
mock.module("@/lib/prisma", () => ({
  prisma: {
    appSetting: {
      findMany: async () => [...stored.entries()].map(([key, value]) => ({ key, value })),
      upsert: async ({ where, create }: { where: { key: string }; create: { value: unknown } }) => void stored.set(where.key, create.value),
    },
  },
}));
const { GET, PUT } = await import("./route");

const put = async (body: unknown) => (await PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }))) as Response;

beforeEach(() => {
  role = "ADMIN";
  stored.clear();
  audited.length = 0;
});

test("only an Admin may read or change settings (403)", async () => {
  role = "MANAGER";
  expect(((await GET()) as Response).status).toBe(403);
  expect((await put({ "ptp.graceDays": 2 })).status).toBe(403);
  expect(stored.size).toBe(0);
});

test("with nothing saved GET returns the defaults", async () => {
  const body = await ((await GET()) as Response).json();
  expect(body).toEqual({ "calling.window": { startHour: 9, endHour: 19 }, "followUp.notReachableTries": 3, "ptp.graceDays": 0, "dashboard.monthlyTargetPct": null });
});

test("bad values are 400 and nothing is saved", async () => {
  expect((await put({ "calling.window": { startHour: 19, endHour: 9 } })).status).toBe(400); // closes before it opens
  expect((await put({ "followUp.notReachableTries": 0 })).status).toBe(400);
  expect((await put({ "ptp.graceDays": 31 })).status).toBe(400);
  expect((await put({ "dashboard.monthlyTargetPct": 101 })).status).toBe(400);
  expect((await put({})).status).toBe(400);
  expect(stored.size).toBe(0);
});

test("a valid change is saved, returned and audited with old and new value", async () => {
  const res = await put({ "ptp.graceDays": 2, "calling.window": { startHour: 10, endHour: 18 } });
  expect(res.status).toBe(200);
  expect(stored.get("ptp.graceDays")).toBe(2);
  expect(audited.map((a) => a[1])).toEqual(["setting.update", "setting.update"]);
  expect(audited.find((a) => a[3] === "ptp.graceDays")?.[4]).toEqual({ from: 0, to: 2 });
});
