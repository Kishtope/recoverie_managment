import { beforeEach, expect, mock, test } from "bun:test";

// Fakes: the signed-in role, what the DB holds, and a log of what the routes wrote.
let role = "ADMIN";
let existing: { id: string; active: boolean; category: string } | null;
const writes: string[] = [];
const audited: unknown[][] = [];
// The `where` the active-questions route asked the DB for.
let activeWhere: unknown;

const row = {
  id: "q1",
  text: "Why is your payment delayed?",
  category: "PAYMENT_DELAY_REASON",
  displayOrder: 1,
  active: true,
  createdAt: new Date("2026-11-20T00:00:00Z"),
  updatedAt: new Date("2026-11-20T00:00:00Z"),
  createdBy: { id: "u1", name: "Admin" },
};

mock.module("@/lib/auth", () => ({
  requireUser: async (roles?: string[]) => (roles && !roles.includes(role) ? { error: Response.json({ error: "no" }, { status: 403 }) } : { user: { id: "u1", role } }),
}));
mock.module("@/lib/audit", () => ({ logAudit: async (...args: unknown[]) => void audited.push(args) }));
mock.module("@/lib/prisma", () => ({
  prisma: {
    customerQuestion: {
      findUnique: async () => existing,
      aggregate: async () => ({ _max: { displayOrder: 4 } }),
      create: async ({ data }: { data: Record<string, unknown> }) => (writes.push(`create:${JSON.stringify(data)}`), { ...row, ...data }),
      update: async ({ data }: { data: Record<string, unknown> }) => (writes.push(`update:${Object.keys(data).join(",")}`), { ...row, ...data }),
      delete: async () => (writes.push("delete"), row),
      findMany: async ({ where }: { where?: unknown }) => ((activeWhere = where), [{ id: "q1", text: row.text, category: row.category }]),
      count: async () => 1,
      groupBy: async () => [{ active: true, _count: { _all: 1 } }],
    },
  },
}));

const list = await import("./route");
const one = await import("./[id]/route");
const active = await import("./active/route");

const json = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "q1" }) };

beforeEach(() => {
  role = "ADMIN";
  existing = { id: "q1", active: true, category: "PAYMENT_DELAY_REASON" };
  writes.length = 0;
  audited.length = 0;
  activeWhere = undefined;
});

test("only an Admin can list, create, edit or delete questions", async () => {
  for (const r of ["AGENT", "MANAGER", "AGENCY_OWNER"]) {
    role = r;
    expect((await list.GET(new Request("http://x")))?.status).toBe(403);
    expect((await list.POST(json({ text: "Any question", category: "GENERAL_QUERIES" })))?.status).toBe(403);
    expect((await one.PATCH(json({ active: false }), ctx))?.status).toBe(403);
    expect((await one.DELETE(new Request("http://x"), ctx))?.status).toBe(403);
  }
  expect(writes).toEqual([]);
});

test("an Admin creates a question that goes last in its category, and it is audited", async () => {
  const res = await list.POST(json({ text: "  When can you pay?  ", category: "PROMISE_TO_PAY" }));
  expect(res?.status).toBe(201);
  expect(writes[0]).toContain('"text":"When can you pay?"');
  expect(writes[0]).toContain('"displayOrder":5');
  expect(writes[0]).toContain('"createdById":"u1"');
  expect(audited[0].slice(0, 3)).toEqual(["u1", "question.create", "CustomerQuestion"]);
});

test("a bad question is a 400 and nothing is written", async () => {
  expect((await list.POST(json({ text: "x", category: "GENERAL_QUERIES" })))?.status).toBe(400);
  expect((await list.POST(json({ text: "A real question", category: "NOPE" })))?.status).toBe(400);
  expect((await one.PATCH(json({}), ctx))?.status).toBe(400);
  expect(writes).toEqual([]);
});

test("deactivating logs a status change; editing the text logs an update; a missing question is a 404", async () => {
  expect((await one.PATCH(json({ active: false }), ctx))?.status).toBe(200);
  expect(audited[0][1]).toBe("question.status");
  expect((await one.PATCH(json({ text: "A reworded question" }), ctx))?.status).toBe(200);
  expect(audited[1][1]).toBe("question.update");
  existing = null;
  expect((await one.PATCH(json({ active: false }), ctx))?.status).toBe(404);
  expect((await one.DELETE(new Request("http://x"), ctx))?.status).toBe(404);
});

test("deleting removes only the question and is audited", async () => {
  expect((await one.DELETE(new Request("http://x"), ctx))?.status).toBe(200);
  expect(writes).toEqual(["delete"]);
  expect(audited[0][1]).toBe("question.delete");
});

test("agents read only the active questions; other roles are refused", async () => {
  role = "AGENT";
  const res = await active.GET();
  expect(res?.status).toBe(200);
  expect(activeWhere).toEqual({ active: true });
  expect((await res?.json())?.questions).toHaveLength(1);
  role = "ADMIN";
  expect((await active.GET())?.status).toBe(403);
});
