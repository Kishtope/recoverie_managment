import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/access";
import { loanScopeWhere } from "@/lib/access";
import { addDays, fromDbDate, todayIst } from "@/lib/dates";
import { dpdBucketWhere } from "@/lib/dpd-bucket";
import type { DayRange } from "@/lib/fy";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import type { TeamQuery } from "@/features/dashboard/schemas";
import type { CollectedSource } from "@/features/dashboard/types";
import type { PeriodLoanRow } from "./loans";
import { classifyPtp } from "./ptp";

export type PeriodData = {
  rows: PeriodLoanRow[];
  range: DayRange;
  collectedSource: CollectedSource;
  // Every payment in the range for these loans, for the daily collection chart (agent-reported amounts are not dated per day, so empty then).
  payments: { day: string; amount: number }[];
};

// Prisma `where` for the loans a dashboard counts: inside the caller's scope, currently allocated, and matching the filters.
export const teamLoanWhere = (user: CurrentUser, q: Pick<TeamQuery, "company" | "branch" | "agencyId" | "agentId" | "bucket">): Prisma.LoanWhereInput => ({
  AND: [
    loanScopeWhere(user),
    { allocations: { some: { active: true, ...(q.agencyId ? { agencyId: q.agencyId } : {}), ...(q.agentId ? { agentId: q.agentId } : {}) } } },
    q.company ? { company: q.company } : {},
    q.branch ? { branch: q.branch } : {},
    dpdBucketWhere(q.bucket),
  ],
});

/**
 * Reads the allocated loans in the caller's scope with what happened on them inside a period, as plain rows the pure metric functions
 * (summarizeLoans, userWiseRows...) can count. One query; collected money comes from imported Payments, or - when no payment was imported
 * for the period at all - from the amounts agents reported in PAID / PART_PAID outcomes (marked by `collectedSource`).
 * Every dashboard, the recovery page and the Excel export call this, so their numbers can never differ.
 */
export const loadPeriodData = async (user: CurrentUser, q: Pick<TeamQuery, "company" | "branch" | "agencyId" | "agentId" | "bucket">, range: DayRange): Promise<PeriodData> => {
  const from = new Date(`${range.from}T00:00:00+05:30`);
  const to = new Date(`${addDays(range.to, 1)}T00:00:00+05:30`);
  const today = todayIst();
  const graceDays = await getSetting("ptp.graceDays");
  const where = teamLoanWhere(user, q);

  const loans = await prisma.loan.findMany({
    where,
    select: {
      id: true,
      overdueAmount: true,
      dpd: true,
      allocations: { where: { active: true }, take: 1, select: { agentId: true } },
      dispositions: {
        where: { createdAt: { gte: from, lt: to } },
        orderBy: { createdAt: "asc" },
        select: { outcome: true, ptpDate: true, ptpAmount: true, paidAmount: true, createdAt: true },
      },
      // Payments from the start of the period on (a promise made inside the period can be paid after it ends).
      payments: { where: { paidOn: { gte: new Date(`${range.from}T00:00:00.000Z`) } }, select: { amount: true, paidOn: true } },
    },
  });

  // Imported payments inside the period decide the source for everyone, so one agent's numbers are never measured differently.
  const hasPayments = loans.some((l) => l.payments.some((p) => (fromDbDate(p.paidOn) as string) <= range.to));
  const collectedSource: CollectedSource = hasPayments ? "payments" : "agent";
  const payments: { day: string; amount: number }[] = [];

  const rows = loans.map<PeriodLoanRow>((l) => {
    const paid = l.payments.map((p) => ({ day: fromDbDate(p.paidOn) as string, amount: p.amount.toNumber() }));
    const inRange = paid.filter((p) => p.day <= range.to);
    if (hasPayments) payments.push(...inRange);

    const collected = hasPayments
      ? inRange.reduce((sum, p) => sum + p.amount, 0)
      : l.dispositions.filter((d) => d.outcome === "PAID" || d.outcome === "PART_PAID").reduce((sum, d) => sum + (d.paidAmount?.toNumber() ?? 0), 0);

    // The latest outcome decides the PTP card; its state needs the payments made from the day it was recorded to the end of the grace window.
    const last = l.dispositions[l.dispositions.length - 1];
    const ptp =
      last?.outcome === "PTP" && last.ptpDate
        ? classifyPtp({
            ptpDate: fromDbDate(last.ptpDate) as string,
            ptpAmount: last.ptpAmount?.toNumber() ?? null,
            graceDays,
            today,
            paidInWindow: paid
              .filter((p) => p.day >= todayIst(last.createdAt) && p.day <= addDays(fromDbDate(last.ptpDate) as string, graceDays))
              .reduce((sum, p) => sum + p.amount, 0),
          })
        : null;

    return {
      loanId: l.id,
      agentId: l.allocations[0]?.agentId ?? null,
      overdue: l.overdueAmount?.toNumber() ?? 0,
      dpd: l.dpd,
      outcomes: l.dispositions.map((d) => d.outcome),
      ptp,
      collected,
    };
  });

  return { rows, range, collectedSource, payments };
};
