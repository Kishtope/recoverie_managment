import type { CurrentUser } from "@/lib/access";
import { callScopeWhere, userScopeWhere } from "@/lib/access";
import { addDays, fromDbDate, todayIst } from "@/lib/dates";
import type { DayRange } from "@/lib/fy";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import type { PerformanceRow } from "@/features/performance/types";
import { callPerformance } from "./calls";
import { classifyPtp } from "./ptp";

/**
 * Per-agent calling performance for a period: calls, connected, missed, average talk time, promises taken and kept, and the callback rate.
 * Agents are the active agents / agency owners inside the caller's user scope (optionally one `agentId`); their calls come from the
 * same call scope the Calls page uses, so these numbers match the Calls list. Shared by GET /api/performance and the Excel export.
 */
export const loadPerformance = async (user: CurrentUser, range: DayRange, agentId?: string): Promise<PerformanceRow[]> => {
  const from = new Date(`${range.from}T00:00:00+05:30`);
  const to = new Date(`${addDays(range.to, 1)}T00:00:00+05:30`);

  const agents = await prisma.user.findMany({
    where: { AND: [userScopeWhere(user), { role: { in: ["AGENT", "CALLER", "AGENCY_OWNER"] } }, agentId ? { id: agentId } : {}] },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const ids = agents.map((a) => a.id);

  const [calls, ptps, graceDays] = await Promise.all([
    prisma.call.findMany({
      where: { AND: [callScopeWhere(user), { agentId: { in: ids } }, { startedAt: { gte: from, lt: to } }] },
      select: { agentId: true, direction: true, status: true, durationSec: true, callbackResolvedAt: true },
    }),
    prisma.disposition.findMany({
      where: { agentId: { in: ids }, outcome: "PTP", createdAt: { gte: from, lt: to } },
      select: { agentId: true, ptpDate: true, ptpAmount: true, createdAt: true, loan: { select: { payments: { where: { paidOn: { gte: new Date(`${range.from}T00:00:00.000Z`) } }, select: { amount: true, paidOn: true } } } } },
    }),
    getSetting("ptp.graceDays"),
  ]);

  const today = todayIst();
  const callsByAgent = Map.groupBy(calls, (c) => c.agentId);
  const ptpsByAgent = Map.groupBy(ptps, (p) => p.agentId);

  return agents.map((a) => {
    const mine = ptpsByAgent.get(a.id) ?? [];
    const kept = mine.filter((p) => {
      if (!p.ptpDate) return false;
      const ptpDay = fromDbDate(p.ptpDate) as string;
      const paid = p.loan.payments
        .filter((x) => (fromDbDate(x.paidOn) as string) >= todayIst(p.createdAt) && (fromDbDate(x.paidOn) as string) <= addDays(ptpDay, graceDays))
        .reduce((sum, x) => sum + x.amount.toNumber(), 0);
      return classifyPtp({ ptpDate: ptpDay, ptpAmount: p.ptpAmount?.toNumber() ?? null, graceDays, today, paidInWindow: paid }) === "kept";
    }).length;
    const perf = callPerformance(callsByAgent.get(a.id) ?? []);
    return { agentId: a.id, name: a.name, ...perf, ptpTaken: mine.length, ptpKept: kept };
  });
};
