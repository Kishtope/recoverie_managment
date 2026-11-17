import { beforeEach, expect, mock, test } from "bun:test";

process.env.TELEPHONY_PROVIDER = "mock";
process.env.TELEPHONY_WEBHOOK_SECRET = "s3cret";

// Tiny in-memory Call table behind the Prisma calls handleCallEvent makes.
let rows: Record<string, unknown>[] = [];
mock.module("@/lib/prisma", () => ({
  prisma: {
    call: {
      findUnique: async ({ where }: { where: { providerCallId?: string; id?: string } }) =>
        rows.find((r) => (where.providerCallId ? r.providerCallId === where.providerCallId : r.id === where.id)) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `c${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => Object.assign(rows.find((r) => r.id === where.id) as object, data),
    },
    loan: { findFirst: async () => null },
  },
}));
const { POST } = await import("./route");

const send = (secret: string | null, body: unknown) =>
  POST(new Request("http://x/api/telephony/webhook", { method: "POST", headers: secret === null ? {} : { "x-telephony-secret": secret }, body: JSON.stringify(body) }));

beforeEach(() => {
  rows = [{ id: "c1", providerCallId: "p1", status: "INITIATED", direction: "OUTBOUND", loanId: "L1", answeredAt: null, endedAt: null, durationSec: null, recordingUrl: null }];
});

test("no secret header -> 401", async () => {
  expect((await send(null, {})).status).toBe(401);
});

test("wrong secret -> 401 and nothing changes", async () => {
  expect((await send("nope", { providerCallId: "p1", direction: "OUTBOUND", status: "CONNECTED" })).status).toBe(401);
  expect(rows[0].status).toBe("INITIATED");
});

test("an empty configured secret never lets anyone in", async () => {
  process.env.TELEPHONY_WEBHOOK_SECRET = "";
  expect((await send("", {})).status).toBe(401);
  process.env.TELEPHONY_WEBHOOK_SECRET = "s3cret";
});

test("right secret: a mock payload updates the call", async () => {
  const res = await send("s3cret", { providerCallId: "p1", direction: "OUTBOUND", status: "CONNECTED", durationSec: 90 });
  expect(res.status).toBe(200);
  expect(rows[0]).toMatchObject({ status: "CONNECTED", durationSec: 90 });
});

test("right secret but a garbage payload still answers 200 (so the provider doesn't retry forever)", async () => {
  const res = await send("s3cret", { nonsense: true });
  expect(res.status).toBe(200);
  expect((await res.json()).received).toBe(0);
});
