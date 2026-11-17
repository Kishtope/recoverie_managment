// Shapes shared by the imports API and screen.
export type ImportKind = "LOANS" | "ALLOCATIONS" | "PAYMENTS";
export type ImportRunStatus = "RUNNING" | "DONE" | "FAILED";

// One rejected row; never contains mobile numbers. `hubUserId` is set when the hub user has no app account.
export type ImportRowError = { row: number; agreementNo: string | null; reason: string; hubUserId?: string };

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

export type ImportListResponse = { items: ImportRunItem[]; total: number; page: number; pageSize: number };

export type ImportListQuery = { type: string; status: string; page: number; pageSize: number };

// Hub users from recent allocation files that have no app account yet.
export type UnmatchedHubUser = { hubUserId: string; rows: number };
