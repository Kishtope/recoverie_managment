import { expect, test } from "bun:test";
import { countBrokenPromises, deriveCaseStatus, derivePtpStatus, deriveRiskTag, ptpStatusAt } from "./case-status";

const base = { loanStatus: "ACTIVE", allocated: true, lastOutcome: null, escalatedAt: null, fieldVisitFlag: false, notReachableCount: 0 } as const;

test("status follows the project.md lifecycle", () => {
  expect(deriveCaseStatus({ ...base, allocated: false })).toBe("NEW");
  expect(deriveCaseStatus(base)).toBe("ASSIGNED");
  expect(deriveCaseStatus({ ...base, lastOutcome: "CALLBACK" })).toBe("IN_PROGRESS");
  expect(deriveCaseStatus({ ...base, lastOutcome: "PTP" })).toBe("PROMISE_TO_PAY");
  expect(deriveCaseStatus({ ...base, lastOutcome: "PART_PAID" })).toBe("PARTIALLY_PAID");
  expect(deriveCaseStatus({ ...base, loanStatus: "CLOSED", lastOutcome: "PAID" })).toBe("PAID");
  expect(deriveCaseStatus({ ...base, loanStatus: "CLOSED" })).toBe("CLOSED");
});

test("side states win: dispute, then field visit, then unreachable", () => {
  expect(deriveCaseStatus({ ...base, lastOutcome: "PTP", escalatedAt: new Date(), fieldVisitFlag: true })).toBe("DISPUTE");
  expect(deriveCaseStatus({ ...base, lastOutcome: "NOT_REACHABLE", fieldVisitFlag: true, notReachableCount: 3 })).toBe("FIELD_VISIT");
  expect(deriveCaseStatus({ ...base, lastOutcome: "NOT_REACHABLE", notReachableCount: 1 })).toBe("UNREACHABLE");
});

test("a promise is pending, kept once money follows, broken once its day passes", () => {
  const today = "2026-11-18";
  expect(derivePtpStatus([], today)).toBeNull();
  expect(derivePtpStatus([{ outcome: "PTP", ptpDate: "2026-11-20" }], today)).toBe("PENDING");
  expect(derivePtpStatus([{ outcome: "PTP", ptpDate: "2026-11-17" }], today)).toBe("BROKEN");
  expect(derivePtpStatus([{ outcome: "PAID", ptpDate: null }, { outcome: "PTP", ptpDate: "2026-11-17" }], today)).toBe("KEPT");
});

test("a payment dated on or after the promise day keeps it, whatever the agent recorded", () => {
  const history = [{ outcome: "PTP", ptpDate: "2026-11-10", day: "2026-11-05" }] as const;
  expect(derivePtpStatus([...history], "2026-11-18")).toBe("BROKEN");
  expect(derivePtpStatus([...history], "2026-11-18", [{ paidOn: "2026-11-04" }])).toBe("BROKEN"); // paid before the promise
  expect(derivePtpStatus([...history], "2026-11-18", [{ paidOn: "2026-11-09" }])).toBe("KEPT");
  expect(countBrokenPromises([...history], "2026-11-18", [{ paidOn: "2026-11-09" }])).toBe(0);
});

test("risk tag and broken-promise count", () => {
  const today = "2026-11-18";
  const twoBroken = [
    { outcome: "PTP", ptpDate: "2026-11-10" },
    { outcome: "PTP", ptpDate: "2026-11-01" },
  ] as const;
  expect(countBrokenPromises([...twoBroken], today)).toBe(2);
  expect(deriveRiskTag(10, false, 0)).toBe("GOOD");
  expect(deriveRiskTag(45, false, 0)).toBe("IRREGULAR");
  expect(deriveRiskTag(10, false, 2)).toBe("CHRONIC");
  expect(deriveRiskTag(120, true, 0)).toBe("DISPUTED");
});

test("each promise in a history has its own state; making a promise never keeps it", () => {
  // Newest first: a second promise (still ahead), then money, then an older promise that money followed.
  const history = [
    { outcome: "PTP" as const, ptpDate: "2026-11-25", day: "2026-11-20" },
    { outcome: "PAID" as const, ptpDate: null, day: "2026-11-18" },
    { outcome: "PTP" as const, ptpDate: "2026-11-19", day: "2026-11-15" },
  ];
  expect(ptpStatusAt(history, 0, "2026-11-21")).toBe("PENDING");
  expect(ptpStatusAt(history, 2, "2026-11-21")).toBe("KEPT");
  expect(ptpStatusAt([{ outcome: "PTP", ptpDate: "2026-11-19", day: "2026-11-15" }], 0, "2026-11-21")).toBe("BROKEN");
});
