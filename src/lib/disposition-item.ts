import type { Prisma } from "@/generated/prisma/client";
import type { DispositionItem } from "@/features/cases/types";
import type { PtpStatus } from "@/lib/case-status";
import { fromDbDate } from "@/lib/dates";

// A saved interaction with its agent and customer answers, as the detail route loads it.
export const dispositionInclude = {
  agent: { select: { id: true, name: true } },
  responses: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.DispositionInclude;

type DispositionRow = Prisma.DispositionGetPayload<{ include: typeof dispositionInclude }>;

// Shapes an interaction for the API. `ptpStatus` is only passed for a promise (derived from the payments that followed it).
// Optional chaining keeps it working for a row created a moment ago that has no answers loaded.
export const toDispositionItem = (d: DispositionRow, ptpStatus: PtpStatus | null = null): DispositionItem => ({
  id: d.id,
  outcome: d.outcome,
  outcomeDetail: d.outcomeDetail ?? null,
  ptpDate: fromDbDate(d.ptpDate),
  ptpAmount: d.ptpAmount?.toNumber() ?? null,
  ptpStatus,
  paidAmount: d.paidAmount?.toNumber() ?? null,
  paymentDate: fromDbDate(d.paymentDate),
  transactionRef: d.transactionRef ?? null,
  remainingAmount: d.remainingAmount?.toNumber() ?? null,
  callbackTime: d.callbackTime ?? null,
  reason: d.reason ?? null,
  category: d.category ?? null,
  nextFollowUpOn: fromDbDate(d.nextFollowUpOn),
  remarks: d.remarks,
  createdAt: d.createdAt.toISOString(),
  agent: d.agent,
  callId: d.callId,
  responses: (d.responses ?? []).map((r) => ({ id: r.id, questionText: r.questionText, category: r.category, response: r.response, remarks: r.remarks })),
});
