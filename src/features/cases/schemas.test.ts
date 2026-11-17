import { expect, test } from "bun:test";
import { buildDispositionSchema } from "./schemas";

const schema = buildDispositionSchema("2026-11-17");
const errorFields = (input: unknown) => {
  const r = schema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.path[0]);
};

test("PTP needs a date and an amount", () => {
  expect(errorFields({ outcome: "PTP" })).toEqual(["ptpDate", "ptpAmount"]);
  expect(errorFields({ outcome: "PTP", ptpDate: "2026-11-20", ptpAmount: 5000 })).toEqual([]);
});

test("PAID / PART_PAID need the amount paid; PART_PAID and CALLBACK need a next follow-up", () => {
  expect(errorFields({ outcome: "PAID" })).toEqual(["paidAmount"]);
  expect(errorFields({ outcome: "PART_PAID", paidAmount: 100 })).toEqual(["nextFollowUpOn"]);
  expect(errorFields({ outcome: "CALLBACK" })).toEqual(["nextFollowUpOn"]);
});

test("REFUSED_DISPUTE and WRONG_NUMBER need remarks", () => {
  expect(errorFields({ outcome: "REFUSED_DISPUTE" })).toEqual(["remarks"]);
  expect(errorFields({ outcome: "WRONG_NUMBER", remarks: "   " })).toEqual(["remarks"]);
});

test("a date before today is rejected, today is fine", () => {
  expect(errorFields({ outcome: "CALLBACK", nextFollowUpOn: "2026-11-16" })).toEqual(["nextFollowUpOn"]);
  expect(errorFields({ outcome: "CALLBACK", nextFollowUpOn: "2026-11-17" })).toEqual([]);
});

test("fields that don't belong to the outcome are dropped", () => {
  const r = schema.parse({ outcome: "CALLBACK", nextFollowUpOn: "2026-11-18", ptpAmount: 10, paidAmount: 10, ptpDate: "2026-11-19" });
  expect(r).toEqual({ outcome: "CALLBACK", nextFollowUpOn: "2026-11-18", ptpDate: undefined, ptpAmount: undefined, paidAmount: undefined, remarks: undefined });
});
