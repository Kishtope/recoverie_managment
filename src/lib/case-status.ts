import type { OUTCOMES } from "@/lib/constants";

type OutcomeCode = (typeof OUTCOMES)[number];

// Case lifecycle from project.md: New -> Assigned -> In progress -> Promise to pay -> Partially paid -> Paid -> Closed,
// plus the side states Dispute, Unreachable and Field visit. There is no Case table, so this is derived from the Loan + Allocation.
export const CASE_STATUSES = ["NEW", "ASSIGNED", "IN_PROGRESS", "PROMISE_TO_PAY", "PARTIALLY_PAID", "PAID", "CLOSED", "DISPUTE", "UNREACHABLE", "FIELD_VISIT"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  PROMISE_TO_PAY: "Promise to pay",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  CLOSED: "Closed",
  DISPUTE: "Dispute",
  UNREACHABLE: "Unreachable",
  FIELD_VISIT: "Field visit",
};

// What the status needs from a loan; dates are "yyyy-MM-dd" so this stays free of DB and timezone code.
export type CaseStatusInput = {
  loanStatus: "ACTIVE" | "CLOSED";
  allocated: boolean;
  lastOutcome: OutcomeCode | null;
  escalatedAt: Date | string | null; // set by REFUSED_DISPUTE until a manager resolves it
  fieldVisitFlag: boolean;
  notReachableCount: number;
};

// Picks the one status that best describes a case. Side states win over the main flow because they change what the agent may do.
export const deriveCaseStatus = (c: CaseStatusInput): CaseStatus => {
  if (c.loanStatus === "CLOSED") return c.lastOutcome === "PAID" ? "PAID" : "CLOSED";
  if (c.escalatedAt) return "DISPUTE";
  if (c.fieldVisitFlag) return "FIELD_VISIT";
  if (c.notReachableCount > 0 && c.lastOutcome === "NOT_REACHABLE") return "UNREACHABLE";
  if (!c.allocated) return "NEW";
  switch (c.lastOutcome) {
    case null:
      return "ASSIGNED";
    case "PTP":
      return "PROMISE_TO_PAY";
    case "PART_PAID":
      return "PARTIALLY_PAID";
    case "PAID":
      return "PAID";
    default:
      return "IN_PROGRESS";
  }
};

// A promise's state: kept once money follows it, broken once its date has passed unpaid, otherwise pending.
export type PtpStatus = "PENDING" | "KEPT" | "BROKEN";

// One outcome in a newest-first history; `day` is the Indian calendar day it was recorded ("yyyy-MM-dd").
export type HistoryItem = { outcome: OutcomeCode; ptpDate: string | null; day?: string };

// Money counts as following a promise when an agent recorded PAID / PART_PAID after it, or a payment (import or manual) is dated on or after
// the day the promise was made.
const moneyFollows = (history: HistoryItem[], idx: number, payments: { paidOn: string }[]) =>
  history.slice(0, idx).some((d) => d.outcome === "PAID" || d.outcome === "PART_PAID") ||
  (!!history[idx].day && payments.some((p) => p.paidOn >= (history[idx].day as string)));

// Newest-first list of outcomes in, the state of the most recent promise out (null when the case never had one).
export const derivePtpStatus = (dispositions: HistoryItem[], today: string, payments: { paidOn: string }[] = []): PtpStatus | null => {
  const idx = dispositions.findIndex((d) => d.outcome === "PTP");
  if (idx === -1) return null;
  if (moneyFollows(dispositions, idx, payments)) return "KEPT";
  const date = dispositions[idx].ptpDate;
  return date && date < today ? "BROKEN" : "PENDING";
};

export const RISK_TAGS = ["GOOD", "IRREGULAR", "CHRONIC", "DISPUTED"] as const;
export type RiskTag = (typeof RISK_TAGS)[number];
export const RISK_TAG_LABELS: Record<RiskTag, string> = { GOOD: "Good", IRREGULAR: "Irregular", CHRONIC: "Chronic defaulter", DISPUTED: "Disputed" };

// Customer risk tag: disputed wins; chronic = 90+ DPD or two or more broken promises; irregular = 30+ DPD or one broken promise.
export const deriveRiskTag = (dpd: number | null, disputed: boolean, brokenPromises: number): RiskTag => {
  if (disputed) return "DISPUTED";
  if ((dpd ?? 0) >= 90 || brokenPromises >= 2) return "CHRONIC";
  if ((dpd ?? 0) >= 30 || brokenPromises === 1) return "IRREGULAR";
  return "GOOD";
};

// How many promises in a newest-first history ended unpaid: a PTP is broken when its date has passed and no payment outcome came after it.
export const countBrokenPromises = (dispositions: HistoryItem[], today: string, payments: { paidOn: string }[] = []) =>
  dispositions.reduce((n, d, i) => {
    if (d.outcome !== "PTP" || !d.ptpDate || d.ptpDate >= today) return n;
    return moneyFollows(dispositions, i, payments) ? n : n + 1;
  }, 0);
