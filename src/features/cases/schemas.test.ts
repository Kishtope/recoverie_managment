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

test("PAID / PART_PAID need the amount and the day it was paid; PART_PAID also needs a next follow-up", () => {
  expect(errorFields({ outcome: "PAID" })).toEqual(["paidAmount", "paymentDate"]);
  expect(errorFields({ outcome: "PAID", paidAmount: 100, paymentDate: "2026-11-16" })).toEqual([]);
  expect(errorFields({ outcome: "PART_PAID", paidAmount: 100, paymentDate: "2026-11-16" })).toEqual(["nextFollowUpOn"]);
});

test("a payment date in the future is rejected, today is fine", () => {
  expect(errorFields({ outcome: "PAID", paidAmount: 100, paymentDate: "2026-11-18" })).toEqual(["paymentDate"]);
  expect(errorFields({ outcome: "PAID", paidAmount: 100, paymentDate: "2026-11-17" })).toEqual([]);
});

test("a callback needs a date and a time", () => {
  expect(errorFields({ outcome: "CALLBACK" })).toEqual(["nextFollowUpOn", "callbackTime"]);
  expect(errorFields({ outcome: "CALLBACK", nextFollowUpOn: "2026-11-18", callbackTime: "25:10" })).toEqual(["callbackTime"]);
  expect(errorFields({ outcome: "CALLBACK", nextFollowUpOn: "2026-11-18", callbackTime: "15:30" })).toEqual([]);
});

test("a refusal needs its reason, a dispute needs a category and a description, and an older client's refusal still needs remarks", () => {
  expect(errorFields({ outcome: "REFUSED_DISPUTE", outcomeDetail: "REFUSED" })).toEqual(["reason"]);
  expect(errorFields({ outcome: "REFUSED_DISPUTE", outcomeDetail: "DISPUTE" })).toEqual(["category", "reason"]);
  expect(errorFields({ outcome: "REFUSED_DISPUTE", outcomeDetail: "DISPUTE", category: "Already paid", reason: "Paid last week" })).toEqual([]);
  expect(errorFields({ outcome: "REFUSED_DISPUTE" })).toEqual(["remarks"]);
  expect(errorFields({ outcome: "WRONG_NUMBER", remarks: "   " })).toEqual(["remarks"]);
});

test("No answer, busy and not interested need nothing extra", () => {
  expect(errorFields({ outcome: "NOT_REACHABLE", outcomeDetail: "NO_ANSWER" })).toEqual([]);
  expect(errorFields({ outcome: "NOT_REACHABLE", outcomeDetail: "BUSY", nextFollowUpOn: "2026-11-17" })).toEqual([]);
  expect(errorFields({ outcome: "NOT_INTERESTED" })).toEqual([]);
});

test("a detail that doesn't belong to the outcome is rejected", () => {
  expect(errorFields({ outcome: "PTP", outcomeDetail: "BUSY", ptpDate: "2026-11-20", ptpAmount: 1 })).toEqual(["outcomeDetail"]);
  expect(errorFields({ outcome: "NOT_REACHABLE", outcomeDetail: "DISPUTE" })).toEqual(["outcomeDetail"]);
});

test("a date before today is rejected, today is fine", () => {
  const callback = { outcome: "CALLBACK", callbackTime: "10:00" };
  expect(errorFields({ ...callback, nextFollowUpOn: "2026-11-16" })).toEqual(["nextFollowUpOn"]);
  expect(errorFields({ ...callback, nextFollowUpOn: "2026-11-17" })).toEqual([]);
});

test("fields that don't belong to the outcome are dropped", () => {
  const r = schema.parse({
    outcome: "CALLBACK",
    nextFollowUpOn: "2026-11-18",
    callbackTime: "10:00",
    ptpAmount: 10,
    paidAmount: 10,
    ptpDate: "2026-11-19",
    transactionRef: "UTR1",
    category: "Already paid",
  });
  expect(r).toMatchObject({ outcome: "CALLBACK", nextFollowUpOn: "2026-11-18", callbackTime: "10:00", responses: [] });
  expect(r.ptpDate).toBeUndefined();
  expect(r.ptpAmount).toBeUndefined();
  expect(r.paidAmount).toBeUndefined();
  expect(r.transactionRef).toBeUndefined();
  expect(r.category).toBeUndefined();
});

test("customer answers need text, can't repeat a question, and empty remarks are dropped", () => {
  const base = { outcome: "NOT_INTERESTED" };
  expect(errorFields({ ...base, responses: [{ questionId: "q1", response: "  " }] })).toEqual(["responses"]);
  expect(errorFields({ ...base, responses: [{ questionId: "q1", response: "a" }, { questionId: "q1", response: "b" }] })).toEqual(["responses"]);
  const r = schema.parse({ ...base, responses: [{ questionId: "q1", response: " Yes ", remarks: "" }] });
  expect(r.responses).toEqual([{ questionId: "q1", response: "Yes", remarks: undefined }]);
});
