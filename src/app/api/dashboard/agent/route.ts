import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere } from "@/lib/auth";
import { monthStart, todayIst } from "@/lib/dates";
import { followUpWhere } from "@/lib/follow-up-where";
import { prisma } from "@/lib/prisma";
import type { AgentDashboard } from "@/features/dashboard/types";

// Agent home numbers, scoped to the agent's own active cases. "Today" and "this month" are Indian-calendar based.
export const GET = async () => {
  const auth = await requireUser(["AGENT"]);
  if ("error" in auth) return auth.error;

  const today = todayIst();
  const scope = loanScopeWhere(auth.user);
  const monthStartIst = new Date(`${monthStart(today)}T00:00:00+05:30`);

  const [totalCases, todayFollowUps, overdueFollowUps, duePtpLoans, due, collected] = await Promise.all([
    prisma.loan.count({ where: scope }),
    prisma.loan.count({ where: { AND: [scope, followUpWhere("today", today)] } }),
    prisma.loan.count({ where: { AND: [scope, followUpWhere("overdue", today)] } }),
    // PTP amount lives on the latest disposition, so read it from there for the loans due today.
    prisma.loan.findMany({
      where: { AND: [scope, followUpWhere("today", today), { lastOutcome: "PTP" }] },
      select: { dispositions: { orderBy: { createdAt: "desc" }, take: 1, select: { ptpAmount: true } } },
    }),
    prisma.loan.aggregate({ where: scope, _sum: { overdueAmount: true } }),
    prisma.disposition.aggregate({
      where: { agentId: auth.user.id, outcome: { in: ["PAID", "PART_PAID"] }, createdAt: { gte: monthStartIst } },
      _sum: { paidAmount: true },
    }),
  ]);

  const body: AgentDashboard = {
    totalCases,
    todayFollowUps,
    overdueFollowUps,
    duePtps: { count: duePtpLoans.length, amount: duePtpLoans.reduce((sum, l) => sum + (l.dispositions[0]?.ptpAmount?.toNumber() ?? 0), 0) },
    dueAmount: due._sum.overdueAmount?.toNumber() ?? 0,
    collectedThisMonth: collected._sum.paidAmount?.toNumber() ?? 0,
  };
  return NextResponse.json(body);
};
