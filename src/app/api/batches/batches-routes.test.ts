import { beforeEach, expect, mock, test } from "bun:test";

// Fakes: the signed-in user, what the DB holds, and a log of what the routes wrote.
let role = "MANAGER";
let batch: { id: string; status: string } | null;
let loans: { id: string }[];
let agency: { id: string } | null;
let updateCount = 1;
let createError: unknown = null;
const writes: string[] = [];
const audited: unknown[][] = [];

const fresh = { id: "b1", name: "Batch 1", type: "CALL", status: "OPEN", assignedOn: null, closedAt: null, createdAt: new Date("2026-11-18T00:00:00Z"), agency: null };

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) =>
    roles && !roles.includes(role) ? { error: Response.json({ error: "no" }, { status: 403 }) } : { user: { id: "u1", role } },
  loanScopeWhere: () => ({}),
}));
mock.module("@/lib/audit", () => ({ logAudit: async (...args: unknown[]) => void audited.push(args) }));
mock.module("@/lib/batches", () => ({
  BATCH_TRANSITIONS: { open: ["DRAFT", "OPEN"], start: ["OPEN", "IN_PROGRESS"], close: ["IN_PROGRESS", "CLOSED"] },
  batchScopeWhere: () => ({}),
  eligibleLoanWhere: () => ({}),
  loadBatchSummaries: async (bs: { id: string }[]) =>
    new Map(bs.map((b) => [b.id, { amounts: { due: 0, collected: 0 }, followups: { total: 0, open: 0, ptp: 0, paid: 0 } }])),
}));
const tx = {
  batch: { create: async () => (writes.push("create-batch"), fresh) },
  batchLoan: { createMany: async ({ data }: { data: unknown[] }) => void writes.push(`link:${data.length}`) },
};
mock.module("@/lib/prisma", () => ({
  prisma: {
    loan: { findMany: async () => loans },
    batch: {
      findFirst: async () => batch,
      findUniqueOrThrow: async () => fresh,
      updateMany: async ({ data }: { data: Record<string, unknown> }) => (writes.push(`update:${data.status}:${"agencyId" in data ? String(data.agencyId) : "-"}`), { count: updateCount }),
      deleteMany: async () => (writes.push("delete"), { count: 1 }),
    },
    agency: { findUnique: async () => agency },
    $transaction: async (fn: (t: typeof tx) => unknown) => {
      if (createError) throw createError;
      return fn(tx);
    },
  },
}));

const list = await import("./route");
const one = await import("./[id]/route");

const json = (body: unknown, method = "POST") => new Request("http://x", { method, body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "b1" }) };

beforeEach(() => {
  role = "MANAGER";
  batch = { id: "b1", status: "DRAFT" };
  loans = [{ id: "L1" }, { id: "L2" }];
  agency = { id: "ag1" };
  updateCount = 1;
  createError = null;
  writes.length = 0;
  audited.length = 0;
});

test("creating a batch links every matching case and is audited", async () => {
  const res = (await list.POST(json({ name: "Batch 1", type: "CALL" }))) as Response;
  expect(res.status).toBe(201);
  expect(writes).toEqual(["create-batch", "link:2"]);
  expect(audited[0]?.[1]).toBe("batch.create");
});

test("creating with no matching cases is a 400 and writes nothing", async () => {
  loans = [];
  const res = (await list.POST(json({ name: "Batch 1", type: "FR" }))) as Response;
  expect(res.status).toBe(400);
  expect(writes).toEqual([]);
});

test("a duplicate batch name is a 409", async () => {
  createError = { code: "P2002" };
  expect(((await list.POST(json({ name: "Batch 1", type: "CALL" }))) as Response).status).toBe(409);
});

test("an agency owner cannot create or change batches", async () => {
  role = "AGENCY_OWNER";
  expect(((await list.POST(json({ name: "Batch 1", type: "CALL" }))) as Response).status).toBe(403);
  expect(((await one.PATCH(json({ action: "open" }, "PATCH"), ctx)) as Response).status).toBe(403);
  expect(((await one.DELETE(new Request("http://x", { method: "DELETE" }), ctx)) as Response).status).toBe(403);
});

test("opening a draft moves it to OPEN", async () => {
  const res = (await one.PATCH(json({ action: "open" }, "PATCH"), ctx)) as Response;
  expect(res.status).toBe(200);
  expect(writes).toEqual(["update:OPEN:-"]);
});

test("a step out of order is a 409 and writes nothing", async () => {
  batch = { id: "b1", status: "DRAFT" };
  expect(((await one.PATCH(json({ action: "close" }, "PATCH"), ctx)) as Response).status).toBe(409);
  expect(writes).toEqual([]);
});

test("starting an open batch records the agency; an unknown agency is a 400", async () => {
  batch = { id: "b1", status: "OPEN" };
  expect(((await one.PATCH(json({ action: "start", agencyId: "ag1" }, "PATCH"), ctx)) as Response).status).toBe(200);
  expect(writes).toEqual(["update:IN_PROGRESS:ag1"]);
  writes.length = 0;
  agency = null;
  expect(((await one.PATCH(json({ action: "start", agencyId: "nope" }, "PATCH"), ctx)) as Response).status).toBe(400);
  expect(writes).toEqual([]);
});

test("starting without an agency keeps it in-house", async () => {
  batch = { id: "b1", status: "OPEN" };
  await one.PATCH(json({ action: "start", agencyId: "" }, "PATCH"), ctx);
  expect(writes).toEqual(["update:IN_PROGRESS:null"]);
});

test("losing a race (status changed under us) is a 409", async () => {
  updateCount = 0;
  expect(((await one.PATCH(json({ action: "open" }, "PATCH"), ctx)) as Response).status).toBe(409);
});

test("only a draft can be deleted", async () => {
  batch = { id: "b1", status: "OPEN" };
  expect(((await one.DELETE(new Request("http://x", { method: "DELETE" }), ctx)) as Response).status).toBe(409);
  batch = { id: "b1", status: "DRAFT" };
  expect(((await one.DELETE(new Request("http://x", { method: "DELETE" }), ctx)) as Response).status).toBe(200);
  expect(writes).toEqual(["delete"]);
});

test("a batch outside the caller's scope is a 404", async () => {
  batch = null;
  expect(((await one.PATCH(json({ action: "open" }, "PATCH"), ctx)) as Response).status).toBe(404);
});
