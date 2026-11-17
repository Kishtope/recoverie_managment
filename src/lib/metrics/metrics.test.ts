import { expect, test } from "bun:test";
import { callPerformance } from "./calls";
import { dailyCollection, dpdBreakdown, outcomeBreakdown, summarizeLoans, userWiseRows, type PeriodLoanRow } from "./loans";
import { classifyPtp } from "./ptp";

const row = (over: Partial<PeriodLoanRow>): PeriodLoanRow => ({ loanId: "l", agentId: "a1", overdue: 1000, dpd: 10, outcomes: [], ptp: null, collected: 0, ...over });

test("every loan lands in exactly one status, and spoke + notSpoke + pending = cases", () => {
  const rows = [
    row({ outcomes: ["PAID"], collected: 1000 }),
    row({ outcomes: ["NOT_REACHABLE", "PART_PAID"], collected: 400 }), // earlier miss, latest part paid: counts as spoke
    row({ outcomes: ["PTP"], ptp: "upcoming" }),
    row({ outcomes: ["NOT_REACHABLE", "WRONG_NUMBER"] }), // never spoke
    row({ outcomes: ["REFUSED_DISPUTE"] }),
    row({ outcomes: [] }), // pending
    row({ outcomes: ["CALLBACK"] }),
  ];
  const s = summarizeLoans(rows);
  expect(s.cases).toBe(7);
  expect(s.paid + s.partPaid + s.ptp.total + s.callback + s.notReachableOrRefused + s.pending).toBe(7);
  expect(s).toMatchObject({ paid: 1, partPaid: 1, callback: 1, pending: 1, notReachableOrRefused: 2, spoke: 5, notSpoke: 1 });
  expect(s.spoke + s.notSpoke + s.pending).toBe(7); // 5 + 1 + 1 (refused counts as spoke: they talked)
  expect(s.ptp).toEqual({ total: 1, upcoming: 1, kept: 0, broken: 0 });
});

test("collection % is collected / due to one decimal, and null when nothing is due", () => {
  expect(summarizeLoans([row({ overdue: 3000, collected: 1000 })]).collectionPct).toBe(33.3);
  expect(summarizeLoans([row({ overdue: 0, collected: 500 })]).collectionPct).toBeNull();
  expect(summarizeLoans([]).collectionPct).toBeNull();
});

test("user-wise rows group by agent, add up to the summary, and pending amount never goes negative", () => {
  const rows = [
    row({ agentId: "a1", overdue: 1000, collected: 1500, outcomes: ["PAID"] }),
    row({ agentId: "a1", overdue: 2000, collected: 0, outcomes: [] }),
    row({ agentId: "a2", overdue: 500, collected: 100, outcomes: ["PTP"], ptp: "broken" }),
  ];
  const users = userWiseRows(rows);
  expect(users.map((u) => u.agentId)).toEqual(["a1", "a2"]); // biggest collected first
  expect(users[0]).toMatchObject({ allocated: 2, paid: 1, pending: 1, dueAmount: 3000, collected: 1500, pendingAmount: 1500 });
  expect(userWiseRows([row({ overdue: 100, collected: 900 })])[0].pendingAmount).toBe(0);
  expect(users.reduce((n, u) => n + u.allocated, 0)).toBe(summarizeLoans(rows).cases);
});

test("outcome and DPD breakdowns keep every loan and every bucket", () => {
  const rows = [row({ outcomes: ["PAID"], dpd: 95 }), row({ outcomes: [], dpd: null }), row({ outcomes: ["PAID"], dpd: 5 })];
  expect(outcomeBreakdown(rows)).toEqual([{ outcome: "PAID", count: 2 }, { outcome: "PENDING", count: 1 }]);
  const dpd = dpdBreakdown(rows);
  expect(dpd).toHaveLength(5);
  expect(dpd.find((b) => b.bucket === "90+")).toMatchObject({ cases: 1, dueAmount: 1000 });
  expect(dpd.reduce((n, b) => n + b.cases, 0)).toBe(3);
});

test("daily collection has one point per day with gaps as 0", () => {
  const out = dailyCollection([{ day: "2026-11-02", amount: 100 }, { day: "2026-11-02", amount: 50 }], { from: "2026-11-01", to: "2026-11-03" });
  expect(out).toEqual([{ day: "2026-11-01", amount: 0 }, { day: "2026-11-02", amount: 150 }, { day: "2026-11-03", amount: 0 }]);
});

test("PTP: kept needs the full promised amount inside the window; broken only after the grace days pass", () => {
  const base = { ptpDate: "2026-11-10", ptpAmount: 5000, graceDays: 2, today: "2026-11-11", paidInWindow: 0 };
  expect(classifyPtp({ ...base, paidInWindow: 5000 })).toBe("kept");
  expect(classifyPtp({ ...base, paidInWindow: 4999 })).toBe("upcoming"); // partial payment, grace not over
  expect(classifyPtp({ ...base, today: "2026-11-12" })).toBe("upcoming"); // last grace day
  expect(classifyPtp({ ...base, today: "2026-11-13" })).toBe("broken");
  expect(classifyPtp({ ...base, today: "2026-11-13", paidInWindow: 2000 })).toBe("broken"); // partial is not kept
  expect(classifyPtp({ ...base, ptpAmount: null, paidInWindow: 1 })).toBe("kept");
});

test("call performance: ringing calls are ignored, talk time averages connected calls, callback % uses inbound missed", () => {
  const out = callPerformance([
    { direction: "OUTBOUND", status: "CONNECTED", durationSec: 60, callbackResolvedAt: null },
    { direction: "OUTBOUND", status: "CONNECTED", durationSec: 180, callbackResolvedAt: null },
    { direction: "OUTBOUND", status: "MISSED", durationSec: null, callbackResolvedAt: null },
    { direction: "OUTBOUND", status: "FAILED", durationSec: null, callbackResolvedAt: null },
    { direction: "OUTBOUND", status: "INITIATED", durationSec: null, callbackResolvedAt: null },
    { direction: "INBOUND", status: "MISSED", durationSec: null, callbackResolvedAt: new Date() },
    { direction: "INBOUND", status: "MISSED", durationSec: null, callbackResolvedAt: null },
  ]);
  expect(out).toMatchObject({ calls: 4, connected: 2, missed: 1, failed: 1, avgTalkSec: 120, inboundMissed: 2, calledBack: 1, callbackPct: 50 });
  expect(callPerformance([])).toMatchObject({ calls: 0, avgTalkSec: null, callbackPct: null });
});
