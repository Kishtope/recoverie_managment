import { beforeEach, expect, mock, test } from "bun:test";

process.env.JWT_ACCESS_SECRET = "test-secret";
const { signAccessToken } = await import("./jwt");

let cookieToken: string | undefined;
let dbUser: Record<string, unknown> | null = null;
mock.module("next/headers", () => ({ cookies: async () => ({ get: () => (cookieToken ? { value: cookieToken } : undefined) }) }));
mock.module("@/lib/prisma", () => ({ prisma: { user: { findUnique: async () => dbUser } } }));
const { requireUser } = await import("./auth");

const active = { id: "u1", name: "U", email: null, role: "AGENT", status: "ACTIVE", agencyId: null, agency: null, access: [] };

beforeEach(() => {
  cookieToken = signAccessToken({ sub: "u1", role: "ADMIN" }, 60); // JWT role is stale on purpose: DB wins
  dbUser = { ...active };
});

test("no cookie -> 401", async () => {
  cookieToken = undefined;
  const res = await requireUser();
  expect(res.error?.status).toBe(401);
});

test("disabled user -> 401", async () => {
  dbUser = { ...active, status: "DISABLED" };
  const res = await requireUser();
  expect(res.error?.status).toBe(401);
});

test("role comes from the DB, not the JWT -> 403", async () => {
  const res = await requireUser(["ADMIN"]);
  expect(res.error?.status).toBe(403);
});

test("allowed role passes", async () => {
  dbUser = { ...active, role: "ADMIN" };
  const res = await requireUser(["ADMIN"]);
  expect(res.user?.role).toBe("ADMIN");
});
