import { expect, test } from "bun:test";
import { summarizeBatch, type BatchLoanInput } from "./batches";

const loan = (over: Partial<BatchLoanInput> = {}): BatchLoanInput => ({ overdue: 1000, lastOutcome: null, payments: [], paidOutcomes: [], ...over });

test("due is the sum of overdue amounts and follow-ups split into open / promised / paid", () => {
  const s = summarizeBatch(
    [loan({ overdue: 500 }), loan({ overdue: 700, lastOutcome: "PTP" }), loan({ lastOutcome: "PAID" }), loan({ lastOutcome: "PART_PAID" }), loan({ lastOutcome: "NOT_REACHABLE" })],
    null,
  );
  expect(s.amounts.due).toBe(500 + 700 + 1000 + 1000 + 1000);
  expect(s.followups).toEqual({ total: 5, open: 2, ptp: 1, paid: 2 });
});

test("a batch that has not started collects nothing, even if the cases were paid before", () => {
  const s = summarizeBatch([loan({ payments: [{ day: "2026-11-10", amount: 900 }] })], null);
  expect(s.amounts.collected).toBe(0);
});

test("collected counts imported payments from the start day on, not earlier ones", () => {
  const s = summarizeBatch(
    [loan({ payments: [{ day: "2026-11-01", amount: 400 }, { day: "2026-11-17", amount: 250 }] }), loan({ payments: [{ day: "2026-11-20", amount: 100 }] })],
    "2026-11-17",
  );
  expect(s.amounts.collected).toBe(350);
});

test("with no payments since the start, collected falls back to what agents reported on paid outcomes", () => {
  const s = summarizeBatch(
    [loan({ paidOutcomes: [{ day: "2026-11-18", amount: 300 }, { day: "2026-11-01", amount: 999 }] }), loan({ payments: [{ day: "2026-11-01", amount: 50 }] })],
    "2026-11-17",
  );
  expect(s.amounts.collected).toBe(300);
});

test("once any payment exists since the start, agent-reported amounts are ignored so money is not counted twice", () => {
  const s = summarizeBatch([loan({ payments: [{ day: "2026-11-18", amount: 200 }], paidOutcomes: [{ day: "2026-11-18", amount: 200 }] })], "2026-11-17");
  expect(s.amounts.collected).toBe(200);
});

test("an empty batch is all zeros", () => {
  expect(summarizeBatch([], "2026-11-17")).toEqual({ amounts: { due: 0, collected: 0 }, followups: { total: 0, open: 0, ptp: 0, paid: 0 } });
});
