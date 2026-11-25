// Shapes shared by the imports API and screen.
import type { AutoAllocateResult } from "@/features/cases/types";
import type { RetailerImportSummary } from "@/features/retailers/types";

export type ImportKind = "LOANS" | "ALLOCATIONS" | "PAYMENTS";
export type ImportRunStatus = "RUNNING" | "DONE" | "FAILED";

// One rejected row (`column` is the file column the problem is in, e.g. "Branch (column AX)"); never contains mobile numbers. `agentEmail` is set when no app user has that email.
export type ImportRowError = { row: number; agreementNo: string | null; reason: string; column?: string; agentEmail?: string };

// What an upload returns: the run summary, plus the result of the auto-allocation when it was asked for (or why it could not run).
export type ImportUploadResult = { run: ImportRunItem; allocation: AutoAllocateResult | null; allocationError: string | null };

// Result of reading a file's header row as soon as it is chosen: the required columns it lacks (by their template names) and its row count.
export type ImportColumnsCheck = { missing: string[]; rows: number };

// What the check step of the upload dialog returns before anything is saved (Retailer module, section 6): the counts, the retailer-wise split and the first rejected rows.
export type ImportPreview = {
  totalRows: number;
  valid: number;
  invalid: number;
  retailers: RetailerImportSummary;
  errors: ImportRowError[]; // the first rows (up to 1,000) that would be rejected (the full list is on the run after the upload)
};

// One row of the runs list / the summary after an upload.
export type ImportRunItem = {
  id: string;
  type: ImportKind;
  status: ImportRunStatus;
  fileName: string;
  totalRows: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  startedAt: string;
  finishedAt: string | null;
  retailers: RetailerImportSummary | null; // how a Loans import was split between callers and retailers; null for other imports
  createdBy: { id: string; name: string } | null;
};

export type ImportRunDetail = ImportRunItem & { errors: ImportRowError[] };


