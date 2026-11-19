import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fromDbDate, todayIst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { daysBetween, escalatedFromRecruiterWhere, loanSearchWhere } from "@/lib/recruiters";
import type { EscalationItem, EscalationsResponse } from "@/features/recruiters/types";

// Cases the daily job moved from a recruiter to a caller, newest first: who held it, who has it now, how long the recruiter kept it and how much
// has been paid since. The new owner is the allocation created at the very moment the old one ended. Admin and Manager.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;

  const sp = new URL(req.url).searchParams;
  const recruiter = sp.get("recruiter")?.trim() || undefined;
  const q = sp.get("q")?.trim();
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(sp.get("pageSize") ?? "10", 10) || 10));

  const where = { AND: [escalatedFromRecruiterWhere(auth.user, recruiter), loanSearchWhere(q)] };
  const [rows, total] = await Promise.all([
    prisma.allocation.findMany({
      where,
      select: {
        id: true,
        loanId: true,
        assignedOn: true,
        endedAt: true,
        agent: { select: { id: true, name: true } },
        loan: { select: { agreementNo: true, overdueAmount: true, customer: { select: { name: true } } } },
      },
      orderBy: [{ endedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.allocation.count({ where }),
  ]);

  const moved = rows.filter((r) => r.endedAt);
  const [successors, payments] = moved.length
    ? await Promise.all([
        prisma.allocation.findMany({
          where: { OR: moved.map((r) => ({ loanId: r.loanId, assignedOn: r.endedAt! })) },
          select: { loanId: true, assignedOn: true, agent: { select: { name: true } } },
        }),
        prisma.payment.findMany({
          where: { loanId: { in: moved.map((r) => r.loanId) } },
          select: { loanId: true, paidOn: true, amount: true },
        }),
      ])
    : [[], []];

  const items: EscalationItem[] = rows.map((r) => {
    const endedAt = r.endedAt ?? r.assignedOn;
    const escalatedDay = todayIst(endedAt);
    const next = successors.find((s) => s.loanId === r.loanId && s.assignedOn.getTime() === endedAt.getTime());
    const recoveredSince = payments
      .filter((p) => p.loanId === r.loanId && (fromDbDate(p.paidOn) as string) >= escalatedDay)
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    return {
      id: r.id,
      loanId: r.loanId,
      agreementNo: r.loan.agreementNo,
      customerName: r.loan.customer.name,
      recruiter: { id: r.agent?.id ?? "", name: r.agent?.name ?? "-" },
      newOwner: next?.agent?.name ?? null,
      assignedOn: r.assignedOn.toISOString(),
      escalatedOn: endedAt.toISOString(),
      daysHeld: daysBetween(todayIst(r.assignedOn), escalatedDay),
      overdueAmount: r.loan.overdueAmount?.toNumber() ?? null,
      recoveredSince,
    };
  });

  const body: EscalationsResponse = { items, total, page, pageSize };
  return NextResponse.json(body);
};
