import type { OUTCOMES } from "@/lib/constants";

export type OutcomeCode = (typeof OUTCOMES)[number];

// One row of the Cases list as returned by GET /api/loans (mobile is already masked on the server).
export type LoanListItem = {
  id: string;
  agreementNo: string;
  customerName: string;
  mobile: string | null;
  area: string | null;
  company: string;
  branch: string;
  dpd: number | null;
  overdueAmount: number | null;
  agent: { id: string; name: string } | null;
  assignedOn: string | null;
  lastOutcome: OutcomeCode | null;
  lastContactedAt: string | null;
  nextFollowUpOn: string | null; // "yyyy-MM-dd"
  lastPtpAmount: number | null; // promised amount of the most recent outcome, when that outcome was a PTP
  fieldVisitFlag: boolean;
  escalated: boolean;
};

export type LoanListResponse = { items: LoanListItem[]; total: number; page: number; pageSize: number };

// Which follow-up dates the list keeps: today, before today, after today, the next 7 days, or no follow-up at all.
export const FOLLOW_UPS = ["all", "today", "overdue", "upcoming", "next7", "none"] as const;
export type FollowUpFilter = (typeof FOLLOW_UPS)[number];

export const FLAGS = ["all", "field-visit", "escalated"] as const;

export type LoanListQuery = {
  q: string;
  agentId: string;
  company: string;
  branch: string;
  followUp: string;
  outcome: string;
  flag: string;
  page: number;
  pageSize: number;
};

// One recorded outcome in a case's history.
export type DispositionItem = {
  id: string;
  outcome: OutcomeCode;
  ptpDate: string | null;
  ptpAmount: number | null;
  paidAmount: number | null;
  nextFollowUpOn: string | null;
  remarks: string | null;
  createdAt: string;
  agent: { id: string; name: string };
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
  dispositions: DispositionItem[];
};

export type LoanDetailResponse = { loan: LoanDetail };

// What the server says a saved outcome did to the case, used for the confirmation toast.
export type DispositionResult = {
  disposition: DispositionItem;
  effects: { nextFollowUpOn: string | null; fieldVisitFlag: boolean; escalated: boolean };
};
