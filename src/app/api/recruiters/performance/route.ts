import { NextResponse } from "next/server";
import { userScopeWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { addDays, fromDbDate, monthStart, todayIst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { RECRUITER_ESCALATION_REASON } from "@/lib/recruiters";
import { RECRUITER_PERIODS, type RecruiterPeriod, type RecruiterPerformanceItem, type RecruiterPerformanceResponse } from "@/features/recruiters/types";

// First and last day ("yyyy-MM-dd") of a period; `from` null = no start (all time).
const periodRange = (period: RecruiterPeriod, today: string): { from: string | null; to: string } => {
  if (period === "all-time") return { from: null, to: today };
  const thisMonth = monthStart(today);
  if (period === "this-month") return { from: thisMonth, to: today };
  return { from: monthStart(addDays(thisMonth, -1)), to: addDays(thisMonth, -1) };
};

// One row per recruiter in the caller's scope for the chosen month (or all time). "Recovered within the limit" is money paid on a case while it was
// still the recruiter's: imported payments when the case has any in that window, else the amounts the recruiter reported on PAID / PART_PAID
// outcomes (the same fallback the batches and dashboards use). Admin and Manager.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const raw = new URL(req.url).searchParams.get("period") ?? "";
  const period = (RECRUITER_PERIODS as readonly string[]).includes(raw) ? (raw as RecruiterPeriod) : "this-month";
  const today = todayIst();
  const { from, to } = periodRange(period, today);
  const inPeriod = (day: string) => (!from || day >= from) && day <= to;

  const recruiters = await prisma.user.findMany({
    where: { AND: [{ role: "RECRUITER", status: "ACTIVE" }, userScopeWhere(auth.user)] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (recruiters.length === 0) return NextResponse.json({ items: [], from, to } satisfies RecruiterPerformanceResponse);
  const ids = recruiters.map((r) => r.id);

  const allocations = await prisma.allocation.findMany({
    where: { agentId: { in: ids } },
    select: { agentId: true, loanId: true, active: true, assignedOn: true, endedAt: true, endReason: true, loan: { select: { overdueAmount: true, status: true } } },
  });
  const loanIds = [...new Set(allocations.map((a) => a.loanId))];
  const [payments, outcomes] = await Promise.all([
    prisma.payment.findMany({ where: { loanId: { in: loanIds } }, select: { loanId: true, paidOn: true, amount: true } }),
    prisma.disposition.findMany({
      where: { agentId: { in: ids }, loanId: { in: loanIds }, outcome: { in: ["PAID", "PART_PAID"] } },
      select: { agentId: true, loanId: true, paidAmount: true, createdAt: true },
    }),
  ]);

  const items: RecruiterPerformanceItem[] = recruiters.map((rec) => {
    const mine = allocations.filter((a) => a.agentId === rec.id);
    const held = mine.filter((a) => a.active && a.loan.status === "ACTIVE");
    let recovered = 0;
    for (const a of mine) {
      // The days this recruiter owned the case, cut to the chosen period.
      const start = todayIst(a.assignedOn);
      const end = a.endedAt ? todayIst(a.endedAt) : today;
      const within = (day: string) => day >= start && day <= end && inPeriod(day);
      const paid = payments.filter((p) => p.loanId === a.loanId && within(fromDbDate(p.paidOn) as string));
      const reported = outcomes.filter((o) => o.agentId === rec.id && o.loanId === a.loanId && within(todayIst(o.createdAt)));
      recovered += paid.length ? paid.reduce((s, p) => s + p.amount.toNumber(), 0) : reported.reduce((s, o) => s + (o.paidAmount?.toNumber() ?? 0), 0);
    }
    return {
      recruiter: rec,
      heldNow: held.length,
      dueNow: held.reduce((s, a) => s + (a.loan.overdueAmount?.toNumber() ?? 0), 0),
      received: mine.filter((a) => inPeriod(todayIst(a.assignedOn))).length,
      escalated: mine.filter((a) => a.endReason === RECRUITER_ESCALATION_REASON && a.endedAt && inPeriod(todayIst(a.endedAt))).length,
      recoveredInLimit: recovered,
    };
  });

  const body: RecruiterPerformanceResponse = { items, from, to };
  return NextResponse.json(body);
};
