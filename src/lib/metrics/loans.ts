import type { OUTCOMES } from "@/lib/constants";
import { DPD_BUCKETS, dpdBucket, type DpdBucket } from "@/lib/dpd-bucket";
import type { PtpState } from "./ptp";

type OutcomeCode = (typeof OUTCOMES)[number];

// One allocated loan as the dashboards see it for a period. The route builds these from the database; everything below is pure.
export type PeriodLoanRow = {
  loanId: string;
  agentId: string | null;
  overdue: number; // the loan's overdue amount (the "due" figure)
  dpd: number | null;
  outcomes: OutcomeCode[]; // outcomes recorded inside the period, oldest first (empty = pending)
  ptp: PtpState | null; // state of the latest PTP when the latest outcome is PTP, else null
  collected: number; // money collected on this loan in the period
};

export type Summary = {
  cases: number;
  dueAmount: number;
  dueCases: number; // cases with an overdue amount above zero
  paid: number;
  partPaid: number;
  callback: number;
  ptp: { total: number; upcoming: number; kept: number; broken: number };
  notReachableOrRefused: number; // latest outcome NOT_REACHABLE / WRONG_NUMBER / REFUSED_DISPUTE
  pending: number; // no outcome in the period
  spoke: number; // at least one outcome that is not NOT_REACHABLE / WRONG_NUMBER
  notSpoke: number; // only NOT_REACHABLE / WRONG_NUMBER
  collected: number;
  collectionPct: number | null; // collected / due, null when nothing is due
};

// Outcomes that mean nobody really talked to the customer.
const NO_CONTACT: readonly OutcomeCode[] = ["NOT_REACHABLE", "WRONG_NUMBER"];

// Collection % to one decimal, or null when nothing is due.
const pct = (collected: number, due: number) => (due > 0 ? Math.round((collected / due) * 1000) / 10 : null);

// The loan's latest outcome in the period, or null when it has none.
const latest = (row: PeriodLoanRow) => row.outcomes[row.outcomes.length - 1] ?? null;

// The dashboard's top cards from a list of loans. Each loan counts in exactly one status by its latest outcome in the period.
export const summarizeLoans = (rows: PeriodLoanRow[]): Summary => {
  const s: Summary = {
    cases: rows.length,
    dueAmount: 0,
    dueCases: 0,
    paid: 0,
    partPaid: 0,
    callback: 0,
    ptp: { total: 0, upcoming: 0, kept: 0, broken: 0 },
    notReachableOrRefused: 0,
    pending: 0,
    spoke: 0,
    notSpoke: 0,
    collected: 0,
    collectionPct: null,
  };
  for (const row of rows) {
    s.dueAmount += row.overdue;
    if (row.overdue > 0) s.dueCases += 1;
    s.collected += row.collected;
    const last = latest(row);
    if (last === null) s.pending += 1;
    else if (row.outcomes.some((o) => !NO_CONTACT.includes(o))) s.spoke += 1;
    else s.notSpoke += 1;
    if (last === "PAID") s.paid += 1;
    else if (last === "PART_PAID") s.partPaid += 1;
    else if (last === "CALLBACK") s.callback += 1;
    else if (last === "PTP") {
      s.ptp.total += 1;
      if (row.ptp) s.ptp[row.ptp] += 1;
    } else if (last) s.notReachableOrRefused += 1;
  }
  s.collectionPct = pct(s.collected, s.dueAmount);
  return s;
};

export type UserRow = {
  agentId: string | null; // null = loans with no active allocation inside this scope
  allocated: number;
  spoke: number;
  notSpoke: number;
  paid: number;
  partPaid: number;
  ptp: number;
  pending: number;
  dueAmount: number;
  collected: number;
  pendingAmount: number; // due not yet collected, never below 0
  collectionPct: number | null;
};

// The user-wise table: the same rules as summarizeLoans, one row per agent, biggest collected amount first.
export const userWiseRows = (rows: PeriodLoanRow[]): UserRow[] => {
  const groups = Map.groupBy(rows, (r) => r.agentId);
  return [...groups.entries()]
    .map(([agentId, list]) => {
      const s = summarizeLoans(list);
      return {
        agentId,
        allocated: s.cases,
        spoke: s.spoke,
        notSpoke: s.notSpoke,
        paid: s.paid,
        partPaid: s.partPaid,
        ptp: s.ptp.total,
        pending: s.pending,
        dueAmount: s.dueAmount,
        collected: s.collected,
        pendingAmount: Math.max(0, s.dueAmount - s.collected),
        collectionPct: s.collectionPct,
      };
    })
    .sort((a, b) => b.collected - a.collected || b.allocated - a.allocated);
};

// How many loans sit at each latest outcome (the outcome bar chart); loans with no outcome are "PENDING".
export const outcomeBreakdown = (rows: PeriodLoanRow[]): { outcome: OutcomeCode | "PENDING"; count: number }[] => {
  const counts = new Map<OutcomeCode | "PENDING", number>();
  for (const row of rows) {
    const key = latest(row) ?? "PENDING";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([outcome, count]) => ({ outcome, count })).sort((a, b) => b.count - a.count);
};

// Cases and due amount per DPD bucket (the bucket chart); empty buckets are kept so the chart axis never changes.
export const dpdBreakdown = (rows: PeriodLoanRow[]): { bucket: DpdBucket; cases: number; dueAmount: number }[] =>
  DPD_BUCKETS.map((bucket) => {
    const inBucket = rows.filter((r) => dpdBucket(r.dpd) === bucket);
    return { bucket, cases: inBucket.length, dueAmount: inBucket.reduce((sum, r) => sum + r.overdue, 0) };
  });

// Money collected per day (the trend chart): one point for every day of the range, so gaps show as 0.
export const dailyCollection = (payments: { day: string; amount: number }[], range: { from: string; to: string }) => {
  const byDay = new Map<string, number>();
  for (const p of payments) byDay.set(p.day, (byDay.get(p.day) ?? 0) + p.amount);
  const out: { day: string; amount: number }[] = [];
  for (let d = new Date(`${range.from}T00:00:00Z`); d.toISOString().slice(0, 10) <= range.to; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    out.push({ day, amount: byDay.get(day) ?? 0 });
  }
  return out;
};
