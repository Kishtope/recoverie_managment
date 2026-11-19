// Shapes shared by the imports API and screen.
import type { AutoAllocateResult } from "@/features/cases/types";

export type ImportKind = "LOANS" | "ALLOCATIONS" | "PAYMENTS";
export type ImportRunStatus = "RUNNING" | "DONE" | "FAILED";

// One rejected row; never contains mobile numbers. `agentEmail` is set when no app user has that email.
export type ImportRowError = { row: number; agreementNo: string | null; reason: string; agentEmail?: string };

// What an upload returns: the run summary, plus the result of the auto-allocation when it was asked for (or why it could not run).
export type ImportUploadResult = { run: ImportRunItem; allocation: AutoAllocateResult | null; allocationError: string | null };

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
  createdBy: { id: string; name: string } | null;
};

export type ImportRunDetail = ImportRunItem & { errors: ImportRowError[] };


