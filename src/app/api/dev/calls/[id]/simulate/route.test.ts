import { afterEach, expect, mock, test } from "bun:test";

// The route must answer 404 before it even looks at the user, so the user/database fakes are never reached in these cases.
mock.module("@/lib/auth", () => ({ requireUser: async () => ({ user: { id: "agent1", role: "AGENT" } }) }));
mock.module("@/lib/prisma", () => ({ prisma: { call: { findFirst: async () => null } } }));
const { POST } = await import("./route");

const env = process.env as Record<string, string | undefined>;
const original = { provider: env.TELEPHONY_PROVIDER, node: env.NODE_ENV };
afterEach(() => {
  env.TELEPHONY_PROVIDER = original.provider;
  env.NODE_ENV = original.node;
});

const simulate = async () =>
  (await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ result: "CONNECTED" }) }), { params: Promise.resolve({ id: "c1" }) })) as Response;

test("with the Sarv provider the simulate route does not exist", async () => {
  env.TELEPHONY_PROVIDER = "sarv";
  expect((await simulate()).status).toBe(404);
});

test("in production the simulate route does not exist, even with the mock provider", async () => {
  env.TELEPHONY_PROVIDER = "mock";
  env.NODE_ENV = "production";
  expect((await simulate()).status).toBe(404);
});

test("mock provider outside production: reaches the call lookup (404 only because the fake has no call)", async () => {
  env.TELEPHONY_PROVIDER = "mock";
  env.NODE_ENV = "test";
  const res = await simulate();
  expect(res.status).toBe(404);
  expect((await res.json()).error).toBe("Call not found");
});
