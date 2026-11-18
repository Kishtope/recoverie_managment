import { expect, test } from "bun:test";
import { batchActionSchema, createBatchSchema } from "./schemas";

test("a batch needs a name of at least 2 characters and a type", () => {
  expect(createBatchSchema.safeParse({ name: "A", type: "CALL" }).success).toBe(false);
  expect(createBatchSchema.safeParse({ name: "Nov DPD 60+", type: "OTHER" }).success).toBe(false);
  expect(createBatchSchema.safeParse({ name: "  Nov DPD 60+  ", type: "FR" })).toMatchObject({ success: true, data: { name: "Nov DPD 60+", type: "FR" } });
});

test("filters are optional and checked: unknown branch, negative or fractional DPD are refused", () => {
  const ok = { name: "Batch 1", type: "CALL" } as const;
  expect(createBatchSchema.safeParse({ ...ok, company: "AF", branch: "Balaghat", minDpd: 60, flaggedOnly: true }).success).toBe(true);
  expect(createBatchSchema.safeParse({ ...ok, branch: "Atlantis" }).success).toBe(false);
  expect(createBatchSchema.safeParse({ ...ok, minDpd: -1 }).success).toBe(false);
  expect(createBatchSchema.safeParse({ ...ok, minDpd: 1.5 }).success).toBe(false);
});

test("an action is one of open, start or close; start may name an agency", () => {
  expect(batchActionSchema.safeParse({ action: "open" }).success).toBe(true);
  expect(batchActionSchema.safeParse({ action: "start", agencyId: "ag1" }).success).toBe(true);
  expect(batchActionSchema.safeParse({ action: "reopen" }).success).toBe(false);
  expect(batchActionSchema.safeParse({}).success).toBe(false);
});
