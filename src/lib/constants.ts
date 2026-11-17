// Branches a user can be given access to; a plain list so a new branch needs no migration.
export const BRANCHES = ["Khairlanji", "Balaghat", "Mandla", "Chhindwara", "Raipur", "Seoni", "Baihar"] as const;

// Lending companies a user can be given access to (mirrors the Prisma `Company` enum).
export const COMPANIES = ["AF", "BLD", "MF", "MMPL"] as const;

// Roles in display order (mirrors the Prisma `Role` enum) with the label shown in the UI.
export const ROLES = ["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT"] as const;
export const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  AGENCY_OWNER: "Agency owner",
  AGENT: "Agent",
};

// Outcome codes an agent can record on a case (mirrors the Prisma `Outcome` enum) with the label shown in the UI.
export const OUTCOMES = ["PAID", "PART_PAID", "PTP", "CALLBACK", "NOT_REACHABLE", "WRONG_NUMBER", "REFUSED_DISPUTE"] as const;
export const OUTCOME_LABELS: Record<(typeof OUTCOMES)[number], string> = {
  PAID: "Paid",
  PART_PAID: "Part paid",
  PTP: "Promise to pay",
  CALLBACK: "Callback",
  NOT_REACHABLE: "Not reachable",
  WRONG_NUMBER: "Wrong number",
  REFUSED_DISPUTE: "Refused / dispute",
};

// Consecutive NOT_REACHABLE outcomes before a case is flagged for a field visit (Phase 4 Settings will make this editable).
export const NOT_REACHABLE_LIMIT = 3;

// RBI calling window in Indian time: a call may start from startHour:00 up to (not including) endHour:00. Phase 4 Settings will make this editable.
export const CALLING_WINDOW = { startHour: 9, endHour: 19 } as const;

// An INITIATED call older than this is treated as dead by the reconciliation job so the agent is never stuck.
export const STALE_CALL_HOURS = 2;
