import { expect, test } from "bun:test";
import { makeReceiptNo } from "./receipt";

test("receipt numbers carry the day and a 6-character code", () => {
  expect(makeReceiptNo("2026-11-18")).toMatch(/^RCP-20261118-[A-HJ-NP-Z2-9]{6}$/);
  expect(makeReceiptNo("2026-11-18", () => new Uint8Array([0, 1, 2, 3, 4, 5]))).toBe("RCP-20261118-ABCDEF");
});

test("two receipts differ", () => {
  expect(makeReceiptNo("2026-11-18")).not.toBe(makeReceiptNo("2026-11-18"));
});
