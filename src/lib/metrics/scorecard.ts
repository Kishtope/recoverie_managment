import type { CurrentUser } from "@/lib/access";
import { userScopeWhere } from "@/lib/access";
import { todayIst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { buildScorecards, monthDays, monthProgress, type ScorecardInput } from "@/lib/scorecard";
import type { ScorecardsResponse } from "@/features/scorecards/types";
import { userWiseRows } from "./loans";
import { loadPeriodData } from "./period";
import { loadPerformance } from "./performance";

/**
 * One month's scorecard for every caller / recruiter / agency owner inside the user's scope. Built from the same loaders as the dashboards
 * (loadPeriodData for cases and money, loadPerformance for calls and promises), so the numbers match the other pages, plus the monthly targets.
 * Shared by GET /api/scorecards, the Excel export and the daily email.
 */
export const loadScorecards = async (user: CurrentUser, month: string, today: string = todayIst()): Promise<ScorecardsResponse> => {
  const range = monthDays(month);
  const progress = monthProgress(month, today);

  const [agents, period, performance] = await Promise.all([
    prisma.user.findMany({
      where: { AND: [userScopeWhere(user), { status: "ACTIVE", role: { in: ["AGENT", "CALLER", "AGENCY_OWNER"] } }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    loadPeriodData(user, {}, range),
    loadPerformance(user, range),
  ]);
  const ids = agents.map((a) => a.id);
  const targets = await prisma.agentTarget.findMany({ where: { month, userId: { in: ids } }, select: { userId: true, collectionAmount: true, casesResolved: true } });

  const money = new Map(userWiseRows(period.rows).filter((r) => r.agentId).map((r) => [r.agentId as string, r]));
  const calls = new Map(performance.map((p) => [p.agentId, p]));
  const target = new Map(targets.map((t) => [t.userId, t]));

  const inputs: ScorecardInput[] = agents.map((a) => {
    const m = money.get(a.id);
    const c = calls.get(a.id);
    const t = target.get(a.id);
    return {
      agentId: a.id,
      name: a.name,
      allocated: m?.allocated ?? 0,
      due: m?.dueAmount ?? 0,
      collected: m?.collected ?? 0,
      resolved: m?.paid ?? 0,
      calls: c?.calls ?? 0,
      connected: c?.connected ?? 0,
      missed: c?.missed ?? 0,
      failed: c?.failed ?? 0,
      inboundMissed: c?.inboundMissed ?? 0,
      callbackPct: c?.callbackPct ?? null,
      ptpTaken: c?.ptpTaken ?? 0,
      ptpKept: c?.ptpKept ?? 0,
      avgTalkSec: c?.avgTalkSec ?? null,
      targetAmount: t?.collectionAmount?.toNumber() ?? null,
      targetResolved: t?.casesResolved ?? null,
    };
  });

  return { month, ...range, elapsedDays: progress.elapsedDays, days: progress.days, collectedSource: period.collectedSource, items: buildScorecards(inputs, progress) };
};
