import { beforeEach, expect, mock, test } from "bun:test";

process.env.CRON_SECRET = "cron-secret";

// A fake Notification table that honours skipDuplicates like MySQL does with the unique dedupe key.
let rows: { dedupeKey: string; userId: string; type: string }[] = [];
mock.module("@/lib/prisma", () => ({
  prisma: {
    loan: {
      findMany: async () => [
        { id: "L1", lastOutcome: "CALLBACK", allocations: [{ agentId: "a1" }] },
        { id: "L2", lastOutcome: "PTP", allocations: [{ agentId: "a1" }] },
      ],
    },
    notification: {
      createMany: async ({ data, skipDuplicates }: { data: { dedupeKey: string; userId: string; type: string }[]; skipDuplicates: boolean }) => {
        let count = 0;
        for (const d of data) {
          if (skipDuplicates && rows.some((r) => r.dedupeKey === d.dedupeKey)) continue;
          rows.push(d);
          count += 1;
        }
        return { count };
      },
    },
  },
}));
const { POST } = await import("./route");

const call = async (secret: string | null) =>
  (await POST(new Request("http://x", { method: "POST", headers: secret === null ? {} : { "x-cron-secret": secret } }))) as Response;

beforeEach(() => {
  rows = [];
});

test("a missing or wrong secret is 401 and creates nothing", async () => {
  expect((await call(null)).status).toBe(401);
  expect((await call("nope")).status).toBe(401);
  expect(rows).toHaveLength(0);
});

test("an empty configured secret never lets anyone in", async () => {
  process.env.CRON_SECRET = "";
  expect((await call("")).status).toBe(401);
  process.env.CRON_SECRET = "cron-secret";
});

test("the right secret creates a follow-up and a PTP notification, and running again creates nothing new", async () => {
  const first = await (await call("cron-secret")).json();
  expect(first).toMatchObject({ due: 2, created: 2 });
  expect(rows.map((r) => r.type).sort()).toEqual(["FOLLOW_UP_DUE", "PTP_DUE"]);
  const second = await (await call("cron-secret")).json();
  expect(second).toMatchObject({ due: 2, created: 0 });
  expect(rows).toHaveLength(2);
});
