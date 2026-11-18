import type { BatchStatus, Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/access";
import { loanScopeWhere } from "@/lib/access";
import { fromDbDate, todayIst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import type { CreateBatchInput } from "@/features/batches/schemas";
import type { BatchAmounts, BatchFollowups } from "@/features/batches/types";

// Prisma `where` for the Batch table limited to what `user` may see. Admin: all. Manager: batches they made plus batches holding cases in
// their scope. Agency owner: only batches assigned to their agency. Anyone else sees nothing.
export const batchScopeWhere = (user: CurrentUser): Prisma.BatchWhereInput => {
  switch (user.role) {
    case "ADMIN":
      return {};
    case "MANAGER":
      return { OR: [{ createdById: user.id }, { loans: { some: { loan: loanScopeWhere(user) } } }] };
    case "AGENCY_OWNER":
      return user.agencyId ? { agencyId: user.agencyId } : { id: "none" };
    default:
      return { id: "none" };
  }
};

// Prisma `where` for the cases a new batch would take: active, inside the caller's scope, matching the filters, and not already in an unfinished batch
// of the same type. FR batches take only cases flagged for a field visit unless told otherwise. The create route and the live preview share it.
export const eligibleLoanWhere = (user: CurrentUser, f: Pick<CreateBatchInput, "type" | "company" | "branch" | "minDpd" | "flaggedOnly">): Prisma.LoanWhereInput => ({
  AND: [
    loanScopeWhere(user),
    { status: "ACTIVE" },
    f.company ? { company: f.company } : {},
    f.branch ? { branch: f.branch } : {},
    f.minDpd !== undefined ? { dpd: { gte: f.minDpd } } : {},
    (f.flaggedOnly ?? f.type === "FR") ? { fieldVisitFlag: true } : {},
    { batches: { none: { batch: { type: f.type, status: { not: "CLOSED" } } } } },
  ],
});

// The single step each action may take: [status it needs, status it leads to].
export const BATCH_TRANSITIONS: Record<"open" | "start" | "close", [BatchStatus, BatchStatus]> = {
  open: ["DRAFT", "OPEN"],
  start: ["OPEN", "IN_PROGRESS"],
  close: ["IN_PROGRESS", "CLOSED"],
};

// One case of a batch with just what the numbers need; payments and outcomes are already dated as "yyyy-MM-dd" Indian days.
export type BatchLoanInput = {
  overdue: number;
  lastOutcome: string | null;
  payments: { day: string; amount: number }[];
  paidOutcomes: { day: string; amount: number }[];
};

// Money and follow-up counts of a batch. Due = overdue amount of its cases. Collected counts from the day the batch went In progress (`startDay`;
// null = not started, so nothing yet): imported payments when any exist since then, else the amounts agents reported on PAID / PART_PAID outcomes
// (the same rule the dashboard uses). Follow-ups: total cases, how many still have no promise or payment, promised, and paid.
export const summarizeBatch = (loans: BatchLoanInput[], startDay: string | null): { amounts: BatchAmounts; followups: BatchFollowups } => {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  let collected = 0;
  if (startDay) {
    const paidSince = loans.flatMap((l) => l.payments.filter((p) => p.day >= startDay).map((p) => p.amount));
    collected = paidSince.length
      ? sum(paidSince)
      : sum(loans.flatMap((l) => l.paidOutcomes.filter((o) => o.day >= startDay).map((o) => o.amount)));
  }
  const ptp = loans.filter((l) => l.lastOutcome === "PTP").length;
  const paid = loans.filter((l) => l.lastOutcome === "PAID" || l.lastOutcome === "PART_PAID").length;
  return {
    amounts: { due: sum(loans.map((l) => l.overdue)), collected },
    followups: { total: loans.length, open: loans.length - ptp - paid, ptp, paid },
  };
};

// Reads the cases of the given batches in one query and returns each batch's numbers (see summarizeBatch).
export const loadBatchSummaries = async (batches: { id: string; assignedOn: Date | null }[]) => {
  const rows = await prisma.batchLoan.findMany({
    where: { batchId: { in: batches.map((b) => b.id) } },
    select: {
      batchId: true,
      loan: {
        select: {
          overdueAmount: true,
          lastOutcome: true,
          payments: { select: { amount: true, paidOn: true } },
          dispositions: { where: { outcome: { in: ["PAID", "PART_PAID"] } }, select: { paidAmount: true, createdAt: true } },
        },
      },
    },
  });

  const byBatch = new Map<string, BatchLoanInput[]>();
  for (const r of rows) {
    const list = byBatch.get(r.batchId) ?? [];
    list.push({
      overdue: r.loan.overdueAmount?.toNumber() ?? 0,
      lastOutcome: r.loan.lastOutcome,
      payments: r.loan.payments.map((p) => ({ day: fromDbDate(p.paidOn) as string, amount: p.amount.toNumber() })),
      paidOutcomes: r.loan.dispositions.map((d) => ({ day: todayIst(d.createdAt), amount: d.paidAmount?.toNumber() ?? 0 })),
    });
    byBatch.set(r.batchId, list);
  }
  return new Map(batches.map((b) => [b.id, summarizeBatch(byBatch.get(b.id) ?? [], b.assignedOn ? todayIst(b.assignedOn) : null)]));
};
