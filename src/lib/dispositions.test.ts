import { expect, test } from "bun:test";
import { planDispositionEffects, suggestFollowUp, type LoanFollowUpState } from "./dispositions";

const NOW = new Date("2026-11-17T10:00:00.000Z");
const fresh: LoanFollowUpState = { notReachableCount: 0, fieldVisitFlag: false, escalatedAt: null };

test("PTP follows up on the promised date", () => {
  const r = planDispositionEffects(fresh, { outcome: "PTP", ptpDate: "2026-11-20" }, NOW);
  expect(r.nextFollowUpOn).toBe("2026-11-20");
  expect(r.lastOutcome).toBe("PTP");
});

test("three NOT_REACHABLE in a row flag a field visit; a callback in between resets the count", () => {
  const one = planDispositionEffects(fresh, { outcome: "NOT_REACHABLE" }, NOW);
  const two = planDispositionEffects(one, { outcome: "NOT_REACHABLE" }, NOW);
  expect(two.fieldVisitFlag).toBe(false);
  const three = planDispositionEffects(two, { outcome: "NOT_REACHABLE" }, NOW);
  expect(three.notReachableCount).toBe(3);
  expect(three.fieldVisitFlag).toBe(true);

  const reset = planDispositionEffects(two, { outcome: "CALLBACK", nextFollowUpOn: "2026-11-18" }, NOW);
  expect(reset.notReachableCount).toBe(0);
  const again = planDispositionEffects(reset, { outcome: "NOT_REACHABLE" }, NOW);
  expect(again.notReachableCount).toBe(1);
  expect(again.fieldVisitFlag).toBe(false);
});

test("a flag that is already set survives a later non-PAID outcome", () => {
  const flagged = { ...fresh, fieldVisitFlag: true, notReachableCount: 3 };
  expect(planDispositionEffects(flagged, { outcome: "CALLBACK", nextFollowUpOn: "2026-11-18" }, NOW).fieldVisitFlag).toBe(true);
});

test("PAID clears both flags and ends follow-up", () => {
  const r = planDispositionEffects({ notReachableCount: 3, fieldVisitFlag: true, escalatedAt: NOW }, { outcome: "PAID" }, NOW);
  expect(r).toMatchObject({ fieldVisitFlag: false, escalatedAt: null, nextFollowUpOn: null, notReachableCount: 0 });
});

test("REFUSED_DISPUTE escalates and ends follow-up; WRONG_NUMBER only ends follow-up", () => {
  const refused = planDispositionEffects(fresh, { outcome: "REFUSED_DISPUTE", nextFollowUpOn: "2026-11-20" }, NOW);
  expect(refused.escalatedAt).toEqual(NOW);
  expect(refused.nextFollowUpOn).toBeNull();
  const wrong = planDispositionEffects(fresh, { outcome: "WRONG_NUMBER" }, NOW);
  expect(wrong.escalatedAt).toBeNull();
  expect(wrong.nextFollowUpOn).toBeNull();
});

test("PART_PAID and CALLBACK keep the date the agent chose", () => {
  expect(planDispositionEffects(fresh, { outcome: "PART_PAID", nextFollowUpOn: "2026-11-25" }, NOW).nextFollowUpOn).toBe("2026-11-25");
});

test("NOT_INTERESTED ends follow-up without escalating", () => {
  const r = planDispositionEffects(fresh, { outcome: "NOT_INTERESTED", nextFollowUpOn: "2026-11-20" }, NOW);
  expect(r.nextFollowUpOn).toBeNull();
  expect(r.escalatedAt).toBeNull();
});

test("suggested follow-up dates: busy today, no answer / callback tomorrow, part payment in a week, nothing for the rest", () => {
  expect(suggestFollowUp("BUSY", "2026-11-30")).toBe("2026-11-30");
  expect(suggestFollowUp("NO_ANSWER", "2026-11-30")).toBe("2026-12-01");
  expect(suggestFollowUp("CALLBACK", "2026-11-30")).toBe("2026-12-01");
  expect(suggestFollowUp("PART_PAID", "2026-11-30")).toBe("2026-12-07");
  for (const choice of ["PTP", "PAID", "REFUSED", "DISPUTE", "WRONG_NUMBER", "NOT_INTERESTED", ""]) expect(suggestFollowUp(choice, "2026-11-30")).toBe("");
});
