import { expect, test } from "bun:test";
import { buildScorecards, monthDays, monthProgress, pctOf, scorecardAlerts, type ScorecardInput } from "./scorecard";

const input = (over: Partial<ScorecardInput> & { agentId: string }): ScorecardInput => ({
  name: over.agentId, allocated: 10, due: 100000, collected: 0, resolved: 0, calls: 0, connected: 0, missed: 0, failed: 0, inboundMissed: 0, callbackPct: null, ptpTaken: 0, ptpKept: 0, avgTalkSec: null, targetAmount: null, targetResolved: null, ...over,
});

test("month progress: part way through, complete, not started", () => {
  expect(monthProgress("2026-11", "2026-11-15")).toEqual({ elapsedDays: 15, days: 30, fraction: 0.5 });
  expect(monthProgress("2026-10", "2026-11-15").fraction).toBe(1);
  expect(monthProgress("2026-12", "2026-11-15")).toMatchObject({ elapsedDays: 0, fraction: 0 });
  expect(monthDays("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
});

test("percentages are one decimal and null without a denominator", () => {
  expect(pctOf(1, 3)).toBe(33.3);
  expect(pctOf(5, 0)).toBeNull();
  expect(pctOf(5, null)).toBeNull();
});

test("ranking is by money collected, ties by cases resolved, and ranks are 1..n", () => {
  const rows = buildScorecards(
    [input({ agentId: "a", collected: 5000, resolved: 1 }), input({ agentId: "b", collected: 9000 }), input({ agentId: "c", collected: 5000, resolved: 3 })],
    { elapsedDays: 30, fraction: 1 },
  );
  expect(rows.map((r) => [r.agentId, r.rank])).toEqual([["b", 1], ["c", 2], ["a", 3]]);
});

test("recovery, contact, promise-kept and target achievement are derived", () => {
  const [row] = buildScorecards([input({ agentId: "a", due: 200000, collected: 50000, calls: 40, connected: 10, ptpTaken: 4, ptpKept: 3, targetAmount: 100000, resolved: 2, targetResolved: 8 })], { elapsedDays: 30, fraction: 1 });
  expect(row).toMatchObject({ recoveryPct: 25, contactPct: 25, ptpKeptPct: 75, achievementPct: 50, resolvedAchievementPct: 25 });
});

test("alerts: well behind the pace to target, and too few calls per day", () => {
  const halfway = { elapsedDays: 15, fraction: 0.5 };
  expect(scorecardAlerts({ achievementPct: 20, calls: 300 }, halfway)).toEqual(["BEHIND_TARGET"]); // 20% at the halfway point (needs >= 30%)
  expect(scorecardAlerts({ achievementPct: 35, calls: 300 }, halfway)).toEqual([]);
  expect(scorecardAlerts({ achievementPct: null, calls: 100 }, halfway)).toEqual(["LOW_CALLS"]); // 6.7 calls a day
  expect(scorecardAlerts({ achievementPct: 0, calls: 0 }, { elapsedDays: 2, fraction: 0.07 })).toEqual([]); // too early in the month to judge
  expect(scorecardAlerts({ achievementPct: 0, calls: 0 }, { elapsedDays: 0, fraction: 0 })).toEqual([]); // month not started
});
