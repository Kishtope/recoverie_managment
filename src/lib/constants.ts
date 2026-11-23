// Branches a user can be given access to; a plain list so a new branch needs no migration.
export const BRANCHES = ["Khairlanji", "Balaghat", "Mandla", "Chhindwara", "Raipur", "Seoni", "Baihar"] as const;

// Lending companies a user can be given access to (mirrors the Prisma `Company` enum).
export const COMPANIES = ["AF", "BLD", "MF", "MMPL"] as const;

// Roles in display order (mirrors the Prisma `Role` enum) with the label shown in the UI.
export const ROLES = ["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT", "CALLER"] as const;
export const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  AGENCY_OWNER: "Agency owner",
  AGENT: "Agent",
  CALLER: "Caller",
};

// Outcome codes an agent can record on a case (mirrors the Prisma `Outcome` enum) with the label shown in the UI.
export const OUTCOMES = ["PAID", "PART_PAID", "PTP", "CALLBACK", "NOT_REACHABLE", "WRONG_NUMBER", "REFUSED_DISPUTE", "NOT_INTERESTED"] as const;
export const OUTCOME_LABELS: Record<(typeof OUTCOMES)[number], string> = {
  PAID: "Paid",
  PART_PAID: "Part paid",
  PTP: "Promise to pay",
  CALLBACK: "Callback",
  NOT_REACHABLE: "Not reachable",
  WRONG_NUMBER: "Wrong number",
  REFUSED_DISPUTE: "Refused / dispute",
  NOT_INTERESTED: "Not interested",
};

// Finer detail stored with an outcome: why it was "not reachable", and whether "refused / dispute" was a refusal or a dispute.
// The outcome (and so the follow-up, field-visit and escalation rules) is unchanged; this only sharpens the label.
export const OUTCOME_DETAILS = ["NO_ANSWER", "BUSY", "REFUSED", "DISPUTE"] as const;
export type OutcomeDetail = (typeof OUTCOME_DETAILS)[number];
export const OUTCOME_DETAIL_LABELS: Record<OutcomeDetail, string> = { NO_ANSWER: "No answer", BUSY: "Call busy", REFUSED: "Refused to pay", DISPUTE: "Dispute" };

// What the agent picks in the outcome panel: each choice is an outcome plus, where it applies, a detail. Order is the order shown.
export const OUTCOME_CHOICES = [
  { value: "PTP", label: "Promise to pay", outcome: "PTP" },
  { value: "PART_PAID", label: "Partial payment", outcome: "PART_PAID" },
  { value: "PAID", label: "Already paid", outcome: "PAID" },
  { value: "CALLBACK", label: "Requested callback", outcome: "CALLBACK" },
  { value: "NO_ANSWER", label: "No answer", outcome: "NOT_REACHABLE", detail: "NO_ANSWER" },
  { value: "BUSY", label: "Call busy", outcome: "NOT_REACHABLE", detail: "BUSY" },
  { value: "REFUSED", label: "Refused to pay", outcome: "REFUSED_DISPUTE", detail: "REFUSED" },
  { value: "DISPUTE", label: "Dispute", outcome: "REFUSED_DISPUTE", detail: "DISPUTE" },
  { value: "WRONG_NUMBER", label: "Wrong number", outcome: "WRONG_NUMBER" },
  { value: "NOT_INTERESTED", label: "Not interested", outcome: "NOT_INTERESTED" },
] as const satisfies readonly { value: string; label: string; outcome: (typeof OUTCOMES)[number]; detail?: OutcomeDetail }[];
export type OutcomeChoice = (typeof OUTCOME_CHOICES)[number]["value"];

// The label for a saved outcome: its detail's label when it has one ("Call busy"), otherwise the outcome's own.
export const outcomeLabel = (outcome: (typeof OUTCOMES)[number], detail?: string | null) =>
  detail && detail in OUTCOME_DETAIL_LABELS ? OUTCOME_DETAIL_LABELS[detail as OutcomeDetail] : OUTCOME_LABELS[outcome];

// What a customer can dispute (shown when the outcome is Dispute).
export const DISPUTE_CATEGORIES = ["Amount is incorrect", "Already paid", "Did not take this loan", "Product or service issue", "Other"] as const;

// Groups for the questions Admin sets up for agents to ask, in the order they are shown.
export const QUESTION_CATEGORIES = ["CUSTOMER_VERIFICATION", "PAYMENT_RELATED", "LOAN_RELATED", "PAYMENT_DELAY_REASON", "PROMISE_TO_PAY", "FOLLOW_UP_RELATED", "GENERAL_QUERIES"] as const;
export type QuestionCategoryCode = (typeof QUESTION_CATEGORIES)[number];
export const QUESTION_CATEGORY_LABELS: Record<QuestionCategoryCode, string> = {
  CUSTOMER_VERIFICATION: "Customer verification",
  PAYMENT_RELATED: "Payment related",
  LOAN_RELATED: "Loan related",
  PAYMENT_DELAY_REASON: "Payment delay reason",
  PROMISE_TO_PAY: "Promise to pay",
  FOLLOW_UP_RELATED: "Follow-up related",
  GENERAL_QUERIES: "General queries",
};

// Consecutive NOT_REACHABLE outcomes before a case is flagged for a field visit (Phase 4 Settings will make this editable).
export const NOT_REACHABLE_LIMIT = 3;

// RBI calling window in Indian time: a call may start from startHour:00 up to (not including) endHour:00. Phase 4 Settings will make this editable.
export const CALLING_WINDOW = { startHour: 9, endHour: 19 } as const;

// An INITIATED call older than this is treated as dead by the reconciliation job so the agent is never stuck.
export const STALE_CALL_HOURS = 2;

// Most outbound calls one case (customer) may get per Indian calendar day, per RBI fair-practice contact rules.
export const MAX_CALLS_PER_DAY = 3;

// Roles that work cases themselves (call, record outcomes, see only their own cases); everyone else supervises.
// A Caller is a telecaller: they phone customers and work their own cases exactly like an Agent, but are a separate role so Admin can tell them apart.
export const WORKER_ROLES = ["AGENT", "CALLER"] as const;
export const isWorkerRole = (role: string | undefined | null): role is (typeof WORKER_ROLES)[number] => role === "AGENT" || role === "CALLER";

// Largest share of an overdue amount a Manager may waive in a settlement without an Admin (Admin setting).
export const SETTLEMENT_MANAGER_LIMIT_PCT = 20;
