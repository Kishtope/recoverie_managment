import type { CallItem } from "@/features/calls/types";
import type { OUTCOMES, QuestionCategoryCode } from "@/lib/constants";
import type { PaymentItem } from "@/features/payments/types";
import type { SettlementItem } from "@/features/settlements/types";
import type { CaseStatus, PtpStatus, RiskTag } from "@/lib/case-status";

export type OutcomeCode = (typeof OUTCOMES)[number];

// One row of the Cases list as returned by GET /api/loans (mobile is already masked on the server).
export type LoanListItem = {
  id: string;
  agreementNo: string;
  customerName: string;
  mobile: string | null;
  mobileAlt: string | null;
  area: string | null;
  company: string;
  branch: string;
  dpd: number | null;
  pendingEmis: number | null; // number of dues still pending
  status: "ACTIVE" | "CLOSED";
  overdueAmount: number | null;
  agent: { id: string; name: string } | null;
  assignedOn: string | null;
  lastOutcome: OutcomeCode | null;
  lastContactedAt: string | null;
  nextFollowUpOn: string | null; // "yyyy-MM-dd"
  lastPtpAmount: number | null; // promised amount of the most recent outcome, when that outcome was a PTP
  fieldVisitFlag: boolean;
  escalated: boolean;
  retailer: { id: string; code: string; name: string } | null; // the customer's retailer; only sent to Admins
};

export type LoanListResponse = { items: LoanListItem[]; total: number; page: number; pageSize: number };

// Which follow-up dates the list keeps: today, before today, after today, the next 7 days, or no follow-up at all.
export const FOLLOW_UPS = ["all", "today", "overdue", "upcoming", "next7", "none"] as const;
export type FollowUpFilter = (typeof FOLLOW_UPS)[number];

export const FLAGS = ["all", "field-visit", "escalated", "settlement-pending"] as const;

export type LoanListQuery = {
  q: string;
  agentId: string;
  company: string;
  branch: string;
  followUp?: string;
  outcome: string;
  flag: string;
  stage?: string; // Cases page tab: all | today | followup | closed
  dpd?: string; // DPD bucket: 0-30 | 31-60 | 61-90 | 90+ | none
  retailerId?: string; // Admin only: a retailer id, or "none" = customers without a retailer
  tab?: string; // Follow-ups page tab: new | today | post | closed
  sort?: string; // "recent" = newest uploaded first; omitted = by follow-up date
  page: number;
  pageSize: number;
};

// Raw outcome-form text; converted to numbers / undefined only when validating on submit.
export type OutcomeFormValues = {
  choice: string;
  ptpDate: string;
  ptpAmount: string;
  paidAmount: string;
  paymentDate: string;
  transactionRef: string;
  callbackTime: string;
  nextFollowUpOn: string;
  reason: string;
  category: string;
  remarks: string;
};

// One customer answer saved with an interaction. The question text is the copy taken when it was saved, so it never changes.
export type ResponseItem = { id: string; questionText: string; category: QuestionCategoryCode; response: string; remarks: string | null };

// One recorded interaction (outcome + customer answers) in a case's history.
export type DispositionItem = {
  id: string;
  outcome: OutcomeCode;
  outcomeDetail: string | null; // NO_ANSWER | BUSY | REFUSED | DISPUTE
  ptpDate: string | null;
  ptpAmount: number | null;
  ptpStatus: PtpStatus | null; // only for a promise: pending, kept or broken
  paidAmount: number | null;
  paymentDate: string | null;
  transactionRef: string | null;
  remainingAmount: number | null;
  callbackTime: string | null; // "HH:mm"; the callback date is nextFollowUpOn
  reason: string | null;
  category: string | null;
  nextFollowUpOn: string | null;
  remarks: string | null;
  createdAt: string;
  agent: { id: string; name: string };
  callId: string | null; // the call this outcome was recorded for, if any
  responses: ResponseItem[];
};

// Why the Call button is off for the agent who owns the case (shown as a muted line next to it).
export type CallBlocked = {
  reason: "OUTSIDE_WINDOW" | "PENDING_OUTCOME" | "CALL_IN_PROGRESS" | "NO_NUMBER" | "DISPUTE" | "DO_NOT_CALL" | "DAILY_LIMIT";
  message: string;
  pendingLoanId?: string; // the case whose call still needs an outcome, so the UI can link to it
};

// Full case for the detail page; every mobile number is masked on the server.
export type LoanDetail = {
  id: string;
  agreementNo: string;
  company: string;
  branch: string;
  status: "ACTIVE" | "CLOSED";
  disbursedOn: string | null;
  emiAmount: number | null;
  pendingEmis: number | null;
  dpd: number | null;
  overdueAmount: number | null;
  nextFollowUpOn: string | null;
  lastOutcome: OutcomeCode | null;
  fieldVisitFlag: boolean;
  escalatedAt: string | null;
  caseStatus: CaseStatus; // derived lifecycle state (lib/case-status.ts)
  ptpStatus: PtpStatus | null; // state of the most recent promise
  riskTag: RiskTag;
  doNotCall: boolean;
  notReachableCount: number; // consecutive not-reachable outcomes so far (the next one is attempt number + 1)
  retailer: { id: string; code: string; name: string; city: string | null; mobile: string } | null; // the retailer holding the customer, if any
  payments: PaymentItem[];
  settlements: SettlementItem[];
  // Agent / recruiter who owns the case, or a supervisor: may record a payment received.
  canRecordPayment: boolean;
  // Owning agent / recruiter with no open request and no dispute: may ask for a settlement.
  canRequestSettlement: boolean;
  // Manager / Agency owner / Admin may resolve a dispute and set or clear do-not-call.
  canManageCompliance: boolean;
  customer: {
    name: string;
    mobilePrimary: string | null;
    mobileAlt: string | null;
    references: { name: string; relation: string; mobile: string | null }[];
    address: string | null;
    pin: string | null;
    area: string | null;
  };
  agent: { id: string; name: string } | null;
  // True only for the agent this case is currently allocated to (the only one who may add an outcome).
  canAddOutcome: boolean;
  // Manager / Agency owner / Admin may move an active case to another agent in their scope.
  canReassign: boolean;
  // Calling: true only for the owning agent while the calling window is open, nothing waits for an outcome and the case is active.
  canCall: boolean;
  callBlocked: CallBlocked | null;
  // This agent's ringing call on this case, or the answered/missed one still waiting for its outcome.
  currentCall: CallItem | null;
  calls: CallItem[];
  dispositions: DispositionItem[];
};

export type LoanDetailResponse = { loan: LoanDetail };

// What the server says a saved outcome did to the case, used for the confirmation toast.
export type DispositionResult = {
  disposition: DispositionItem;
  effects: { nextFollowUpOn: string | null; fieldVisitFlag: boolean; escalated: boolean; callLinked: boolean; answers: number };
};

// Result of POST /api/loans/bulk-reassign: how many cases moved and why the others did not.
export type BulkReassignResult = { moved: number; skipped: { loanId: string; reason: string }[] };

// Result of POST /api/allocation/auto (preview or real run): per-person totals and the cases nobody could take.
export type AutoAllocateResult = {
  dryRun: boolean;
  totalUnassigned: number;
  assigned: number;
  unassigned: number;
  capped: boolean; // true when more unassigned cases exist than one run handles
  people: { agentId: string; name: string; cases: number; amount: number; buckets: Record<string, number> }[];
};
