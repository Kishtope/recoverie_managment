import { expect, mock, test } from "bun:test";

let dbUp = true;
mock.module("next/server", () => ({
  connection: async () => {},
  NextResponse: { json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } }) },
}));
mock.module("@/lib/prisma", () => ({ prisma: { $queryRaw: async () => (dbUp ? [{ 1: 1 }] : Promise.reject(new Error("connect ECONNREFUSED secret-host:3306"))) } }));
const { GET } = await import("./route");

test("database reachable: 200 ok with only status, db and time", async () => {
  dbUp = true;
  const res = await GET();
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(Object.keys(body).sort()).toEqual(["db", "status", "time"]);
  expect(body).toMatchObject({ status: "ok", db: true });
});

test("database down: 503 degraded, and the error text is never exposed", async () => {
  dbUp = false;
  const res = await GET();
  expect(res.status).toBe(503);
  const text = JSON.stringify(await res.json());
  expect(text).toContain("degraded");
  expect(text).not.toContain("secret-host");
  expect(text).not.toContain("ECONNREFUSED");
});
