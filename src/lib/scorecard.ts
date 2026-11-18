import { addDays } from "@/lib/dates";

// Calls a caller is expected to place per elapsed day before the "low calls" alert shows (project.md: "jiske calls kam hon").
export const MIN_CALLS_PER_DAY = 10;
// How many percentage points behind the straight-line pace to the target a caller may be before the "behind target" alert shows.
export const BEHIND_TARGET_MARGIN_PCT = 20;

export type ScorecardAlert = "BEHIND_TARGET" | "LOW_CALLS";
export const SCORECARD_ALERT_LABELS: Record<ScorecardAlert, string> = { BEHIND_TARGET: "Behind target", LOW_CALLS: "Low calls" };

// One caller's month, from the numbers the dashboards already compute.
export type ScorecardInput = {
  agentId: string;
  name: string;
  allocated: number;
  due: number;
  collected: number;
  resolved: number; // cases whose latest outcome in the month is PAID
  calls: number;
  connected: number;
  missed: number; // outbound calls nobody picked up
  failed: number; // outbound calls that never connected
  inboundMissed: number; // customer calls we missed
  callbackPct: number | null; // share of those missed customer calls that were called back
  ptpTaken: number;
  ptpKept: number;
  avgTalkSec: number | null;
  targetAmount: number | null;
  targetResolved: number | null;
};

export type ScorecardRow = ScorecardInput & {
  rank: number; // 1 = most collected
  recoveryPct: number | null; // collected / due
  contactPct: number | null; // connected / calls
  ptpKeptPct: number | null; // kept / taken
  achievementPct: number | null; // collected / target amount (null without a target)
  resolvedAchievementPct: number | null;
  alerts: ScorecardAlert[];
};

// Percentage to one decimal, or null when the denominator is 0 / missing.
export const pctOf = (part: number, whole: number | null) => (whole && whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

// How far into `month` ("yyyy-MM") `today` is: elapsed days (at least 1 once the month has started) and the share of the month gone.
// A past month is complete (1.0), a future month has not started (0).
export const monthProgress = (month: string, today: string) => {
  const first = `${month}-01`;
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10);
  const days = Math.round((Date.parse(`${next}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000);
  if (today >= next) return { elapsedDays: days, days, fraction: 1 };
  if (today < first) return { elapsedDays: 0, days, fraction: 0 };
  const elapsedDays = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000) + 1;
  return { elapsedDays, days, fraction: elapsedDays / days };
};

// Alerts for one caller: far behind the straight-line pace to their target, or placing too few calls per day so far.
// Calls are only judged once three days of the month have passed, so the first days of a month do not flag everyone.
export const scorecardAlerts = (row: Pick<ScorecardRow, "achievementPct" | "calls">, progress: { elapsedDays: number; fraction: number }): ScorecardAlert[] => {
  const alerts: ScorecardAlert[] = [];
  if (row.achievementPct !== null && progress.fraction > 0 && row.achievementPct < progress.fraction * 100 - BEHIND_TARGET_MARGIN_PCT) alerts.push("BEHIND_TARGET");
  if (progress.elapsedDays >= 3 && row.calls / progress.elapsedDays < MIN_CALLS_PER_DAY) alerts.push("LOW_CALLS");
  return alerts;
};

// Scorecard rows: derived percentages, alerts and a ranking by money collected (ties: more cases resolved, then name) so the order is repeatable.
export const buildScorecards = (inputs: ScorecardInput[], progress: { elapsedDays: number; fraction: number }): ScorecardRow[] =>
  inputs
    .map((i) => {
      const base = {
        ...i,
        recoveryPct: pctOf(i.collected, i.due),
        contactPct: pctOf(i.connected, i.calls),
        ptpKeptPct: pctOf(i.ptpKept, i.ptpTaken),
        achievementPct: pctOf(i.collected, i.targetAmount),
        resolvedAchievementPct: pctOf(i.resolved, i.targetResolved),
      };
      return { ...base, alerts: scorecardAlerts(base, progress) };
    })
    .sort((a, b) => b.collected - a.collected || b.resolved - a.resolved || a.name.localeCompare(b.name))
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

// First and last day of "yyyy-MM" as a day range.
export const monthDays = (month: string) => ({ from: `${month}-01`, to: addDays(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10), -1) });
