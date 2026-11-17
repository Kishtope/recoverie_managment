import { logAudit } from "@/lib/audit";
import { loadPeriodData } from "@/lib/metrics/period";
import { loadPerformance } from "@/lib/metrics/performance";
import { parseTeamRequest } from "@/lib/metrics/team-request";
import { prisma } from "@/lib/prisma";
import { buildDailyMis } from "@/lib/reports/daily-mis";

// Daily MIS as an Excel file for the caller's scope and the dashboard's current filters. It is built from the same functions as the
// dashboard (see lib/reports/daily-mis.ts) and every export is written to the audit log. Admin, Manager and Agency owner only.
export const GET = async (req: Request) => {
  const parsed = await parseTeamRequest(req);
  if ("error" in parsed) return parsed.error;
  const { user, q, range, period } = parsed;

  const data = await loadPeriodData(user, q, range);
  const performance = await loadPerformance(user, range, q.agentId);
  const ids = [...new Set(data.rows.map((r) => r.agentId).filter((id): id is string => !!id))];
  const names = new Map((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));

  const title = `FY ${period.fy}${period.month === "all" ? "" : `, ${period.month}`}`;
  const file = await buildDailyMis({ title, from: range.from, to: range.to, collectedSource: data.collectedSource, rows: data.rows, names, performance });
  await logAudit(user.id, "report.export", "report", "daily-mis", { fy: q.fy, month: q.month, company: q.company ?? null, branch: q.branch ?? null, agentId: q.agentId ?? null });

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="daily-mis-${period.fy}${period.month === "all" ? "" : `-${period.month}`}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
};
