import type { Outcome } from "@/generated/prisma/client";

// The two kinds of batch (mirrors the Prisma `BatchType` enum): worked by phone, or by field visits (FR = field recovery).
export const BATCH_TYPES = ["CALL", "FR"] as const;
export type BatchTypeValue = (typeof BATCH_TYPES)[number];
export const BATCH_TYPE_LABELS: Record<BatchTypeValue, string> = { CALL: "Call", FR: "FR" };

// Prisma `BatchStatus` values (Draft -> Open -> In progress -> Closed).
export const BATCH_STATUSES = ["DRAFT", "OPEN", "IN_PROGRESS", "CLOSED"] as const;
export type BatchStatusValue = (typeof BATCH_STATUSES)[number];

// The stage tabs of the list, in order; each one is a status (kebab-case because it lives in the URL).
export const BATCH_STAGES = ["drafts", "open", "in-progress", "closed"] as const;
export type BatchStage = (typeof BATCH_STAGES)[number];
export const STAGE_STATUS: Record<BatchStage, BatchStatusValue> = { drafts: "DRAFT", open: "OPEN", "in-progress": "IN_PROGRESS", closed: "CLOSED" };

// Label of a stage tab; "In progress" reads as "In call" / "In FR" because that is what the team calls it.
export const stageLabel = (stage: BatchStage, type: BatchTypeValue) =>
  stage === "drafts" ? "Drafts" : stage === "open" ? "Open" : stage === "closed" ? "Closed" : type === "CALL" ? "In call" : "In FR";

// The money and follow-up counts shown on a batch row. `open` = cases with no promise or payment yet (total - ptp - paid).
export type BatchAmounts = { due: number; collected: number };
export type BatchFollowups = { total: number; open: number; ptp: number; paid: number };

// One row of the Batches list as returned by GET /api/batches.
export type BatchListItem = {
  id: string;
  name: string;
  type: BatchTypeValue;
  status: BatchStatusValue;
  agency: { id: string; name: string } | null;
  assignedOn: string | null;
  closedAt: string | null;
  createdAt: string;
  amounts: BatchAmounts;
  followups: BatchFollowups;
};

export type BatchListQuery = { type: string; stage: string; q: string; page: number; pageSize: number };

// `counts` = how many batches each stage tab holds for the chosen type (ignores search and page).
export type BatchListResponse = { items: BatchListItem[]; total: number; page: number; pageSize: number; counts: Record<BatchStage, number> };

// A case inside a batch, for the detail sheet.
export type BatchCase = {
  id: string;
  agreementNo: string;
  customerName: string;
  company: string;
  branch: string;
  dpd: number | null;
  overdueAmount: number | null;
  lastOutcome: Outcome | null;
};

// GET /api/batches/[id]: the batch plus its biggest cases (up to 100; `casesTotal` is the real count).
export type BatchDetail = BatchListItem & { cases: BatchCase[]; casesTotal: number };

// Choices for the Assign dialog.
export type BatchOptions = { agencies: { id: string; name: string }[] };

// How many cases a new batch with the chosen filters would hold, and the most one batch may hold.
export type BatchPreview = { count: number; max: number };
