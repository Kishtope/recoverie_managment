import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadPeriodData } from "@/lib/metrics/period";
import { userWiseRows } from "@/lib/metrics/loans";
import { parseTeamRequest } from "@/lib/metrics/team-request";
import type { TeamUserRow, TeamUsersResponse } from "@/features/dashboard/types";

// User-wise recovery table (one row per agent in the caller's scope), sorted and paged on the server. Row order is the `sort` column,
// biggest first; "-" for agents with no cases never appears because only allocated loans are counted.
export const GET = async (req: Request) => {
  const parsed = await parseTeamRequest(req);
  if ("error" in parsed) return parsed.error;
  const { q } = parsed;

  const data = await loadPeriodData(parsed.user, q, parsed.range);
  const all = userWiseRows(data.rows).sort((a, b) => (b[q.sort] ?? -1) - (a[q.sort] ?? -1));
  const pageRows = all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);

  const ids = pageRows.map((r) => r.agentId).filter((id): id is string => !!id);
  const names = new Map((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const items: TeamUserRow[] = pageRows.map((r) => ({ ...r, name: r.agentId ? (names.get(r.agentId) ?? "Unknown") : "Unassigned" }));

  const body: TeamUsersResponse = { period: parsed.period, items, total: all.length, page: q.page, pageSize: q.pageSize, collectedSource: data.collectedSource };
  return NextResponse.json(body);
};
