import { NextResponse } from "next/server";
import { requireUser, ownCaseWhere } from "@/lib/auth";
import { monthStart, todayIst } from "@/lib/dates";
import { followUpWhere } from "@/lib/follow-up-where";
import { loadPeriodData } from "@/lib/metrics/period";
import { summarizeLoans } from "@/lib/metrics/loans";
import { prisma } from "@/lib/prisma";
import { monthDays, pctOf } from "@/lib/scorecard";
import type { AgentDashboard } from "@/features/dashboard/types";

// Agent home numbers, scoped to the agent's own active cases. "Today" and "this month" are Indian-calendar based.
export const GET = async () => {
  const auth = await requireUser(["AGENT"]);
  if ("error" in auth) return auth.error;

  const today = todayIst();
  const scope = ownCaseWhere(auth.user.id);
  const monthStartIst = new Date(`${monthStart(today)}T00:00:00+05:30`);

  const dayStartIst = new Date(`${today}T00:00:00+05:30`);
  const callsToday = { agentId: auth.user.id, direction: "OUTBOUND" as const, startedAt: { gte: dayStartIst } };

  const [totalCases, todayFollowUps, overdueFollowUps, duePtpLoans, due, collected, missedCallbacks, callsTotal, callsConnected] = await Promise.all([
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
    prisma.call.count({ where: { agentId: auth.user.id, direction: "INBOUND", status: "MISSED", callbackResolvedAt: null } }),
    prisma.call.count({ where: callsToday }),
    prisma.call.count({ where: { ...callsToday, status: "CONNECTED" } }),
  ]);

  // This month's target and progress, measured the same way as the scorecards (payments when imported, else what the agent recorded).
  const month = today.slice(0, 7);
  const targetRow = await prisma.agentTarget.findUnique({ where: { userId_month: { userId: auth.user.id, month } }, select: { collectionAmount: true, casesResolved: true } });
  let target: AgentDashboard["target"] = null;
  if (targetRow) {
    const mine = summarizeLoans((await loadPeriodData(auth.user, {}, monthDays(month))).rows);
    const amount = targetRow.collectionAmount?.toNumber() ?? null;
    target = {
      month, collectionAmount: amount, casesResolved: targetRow.casesResolved, collected: mine.collected, resolved: mine.paid,
      collectedPct: pctOf(mine.collected, amount), resolvedPct: pctOf(mine.paid, targetRow.casesResolved),
    };
  }

  const body: AgentDashboard = {
    totalCases,
    todayFollowUps,
    overdueFollowUps,
    duePtps: { count: duePtpLoans.length, amount: duePtpLoans.reduce((sum, l) => sum + (l.dispositions[0]?.ptpAmount?.toNumber() ?? 0), 0) },
    dueAmount: due._sum.overdueAmount?.toNumber() ?? 0,
    missedCallbacks,
    callsToday: { connected: callsConnected, total: callsTotal },
    collectedThisMonth: collected._sum.paidAmount?.toNumber() ?? 0,
    target,
  };
  return NextResponse.json(body);
};
