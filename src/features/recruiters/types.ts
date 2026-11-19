import type { Outcome } from "@/generated/prisma/client";

// The tabs of the Recruiters page (kebab-case because the active one lives in the URL).
export const RECRUITER_TABS = ["cases", "escalations", "performance", "rules"] as const;
export type RecruiterTab = (typeof RECRUITER_TABS)[number];
export const RECRUITER_TAB_LABELS: Record<RecruiterTab, string> = { cases: "Cases", escalations: "Escalations", performance: "Performance", rules: "Rules" };

// Stage filter of the Cases tab: every case a recruiter holds, or only those at or near their deadline.
export const RECRUITER_STAGES = ["with-recruiter", "due-soon"] as const;
export type RecruiterStage = (typeof RECRUITER_STAGES)[number];

// Period filter of the Performance tab.
export const RECRUITER_PERIODS = ["this-month", "last-month", "all-time"] as const;
export type RecruiterPeriod = (typeof RECRUITER_PERIODS)[number];
export const RECRUITER_PERIOD_LABELS: Record<RecruiterPeriod, string> = { "this-month": "This month", "last-month": "Last month", "all-time": "All time" };

// The recruiter named on a row.
export type RecruiterRef = { id: string; name: string };

// One case a recruiter holds right now, with where it stands against the escalation limit.
export type RecruiterCaseItem = {
  allocationId: string;
  loanId: string;
  agreementNo: string;
  customerName: string;
  recruiter: RecruiterRef;
  assignedOn: string;
  deadline: string; // "yyyy-MM-dd"
  daysLeft: number; // negative once the limit has passed
  overdue: boolean;
  dpd: number | null;
  overdueAmount: number | null;
  lastOutcome: Outcome | null;
};

// `counts` fills the stage toggle: all cases held, and those due soon (daysLeft at or below the reminder days).
export type RecruiterCasesResponse = {
  items: RecruiterCaseItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<RecruiterStage, number>;
};

// One case that moved from a recruiter to a caller.
export type EscalationItem = {
  id: string;
  loanId: string;
  agreementNo: string;
  customerName: string;
  recruiter: RecruiterRef;
  newOwner: string | null; // the caller who received it; null if it cannot be found
  assignedOn: string; // when the recruiter got it
  escalatedOn: string;
  daysHeld: number;
  overdueAmount: number | null;
  recoveredSince: number; // money paid on the case since it moved
};

export type EscalationsResponse = { items: EscalationItem[]; total: number; page: number; pageSize: number };

// One recruiter's numbers for the chosen period.
export type RecruiterPerformanceItem = {
  recruiter: RecruiterRef;
  heldNow: number; // cases they hold today
  dueNow: number; // overdue amount of those cases
  received: number; // cases handed to them in the period
  escalated: number; // cases that moved on to a caller in the period
  recoveredInLimit: number; // money paid while the case was still theirs
};

export type RecruiterPerformanceResponse = { items: RecruiterPerformanceItem[]; from: string | null; to: string };

// Filters for the recruiter dropdown and the rules shown on the Rules tab (readable by Managers, unlike /settings).
export type RecruiterOptions = { recruiters: RecruiterRef[]; rules: { escalationDays: number; reminderDays: number } };

// Result of POST /api/recruiters/assign.
export type AssignCasesResult = { assigned: number; recruiterName: string };

export type RecruiterCasesQuery = { stage: string; recruiter: string; q: string; page: number; pageSize: number };
export type EscalationsQuery = { recruiter: string; q: string; page: number; pageSize: number };
