import type { BatchListItem } from "@/features/batches/types";
import type { summarizeBatch } from "@/lib/batches";

// The columns of a Batch row every batches route reads.
export const batchSelect = {
  id: true,
  name: true,
  type: true,
  status: true,
  assignedOn: true,
  closedAt: true,
  createdAt: true,
  agency: { select: { id: true, name: true } },
} as const;

type BatchRow = {
  id: string;
  name: string;
  type: BatchListItem["type"];
  status: BatchListItem["status"];
  assignedOn: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  agency: { id: string; name: string } | null;
};

// Turns a Batch row plus its computed numbers into the JSON the Batches list and detail return.
export const toBatchItem = (b: BatchRow, summary: ReturnType<typeof summarizeBatch>): BatchListItem => ({
  id: b.id,
  name: b.name,
  type: b.type,
  status: b.status,
  agency: b.agency,
  assignedOn: b.assignedOn?.toISOString() ?? null,
  closedAt: b.closedAt?.toISOString() ?? null,
  createdAt: b.createdAt.toISOString(),
  amounts: summary.amounts,
  followups: summary.followups,
});
