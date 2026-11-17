import { expect, mock, test } from "bun:test";

mock.module("@/lib/prisma", () => ({ prisma: {} }));
const { paymentDedupeKey } = await import("./payments");
const { paymentRowSchema } = await import("@/features/imports/schemas");
const { mapColumns } = await import("./columns");

test("the same payment always gets the same key, and a different amount, day or receipt gets another", () => {
  const day = new Date("2026-11-10T00:00:00Z");
  const key = paymentDedupeKey("L1", day, 4500, "R1");
  expect(paymentDedupeKey("L1", day, 4500, "R1")).toBe(key);
  expect(paymentDedupeKey("L1", day, 4500.0, "R1")).toBe(key);
  expect(paymentDedupeKey("L1", day, 4501, "R1")).not.toBe(key);
  expect(paymentDedupeKey("L1", new Date("2026-11-11T00:00:00Z"), 4500, "R1")).not.toBe(key);
  expect(paymentDedupeKey("L1", day, 4500, "R2")).not.toBe(key);
  expect(paymentDedupeKey("L2", day, 4500, "R1")).not.toBe(key);
});

test("a payment row needs a positive amount and a real date", () => {
  expect(paymentRowSchema.safeParse({ agreementNo: "A1", amount: "₹ 4,500", paidOn: "10-11-2026" }).success).toBe(true);
  expect(paymentRowSchema.safeParse({ agreementNo: "A1", amount: "0", paidOn: "10-11-2026" }).success).toBe(false);
  expect(paymentRowSchema.safeParse({ agreementNo: "A1", amount: "abc", paidOn: "10-11-2026" }).success).toBe(false);
  expect(paymentRowSchema.safeParse({ agreementNo: "A1", amount: "100", paidOn: "31-02-2026" }).success).toBe(false);
});

test("a Payments file without an amount column is rejected up front", () => {
  const ok = mapColumns("PAYMENTS", ["Agreement No", "Amount", "Paid On"], [{ row: 2, cells: ["A1", "100", "10-11-2026"] }]);
  expect(ok.missing).toEqual([]);
  expect(ok.rows[0].values).toMatchObject({ agreementNo: "A1", amount: "100" });
  expect(mapColumns("PAYMENTS", ["Agreement No", "Paid On"], []).missing).toEqual(["amount"]);
});
