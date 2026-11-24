import ExcelJS from "exceljs";
import { logAudit } from "@/lib/audit";
import { loadPeriodData } from "@/lib/metrics/period";
import { userWiseRows } from "@/lib/metrics/loans";
import { parseTeamRequest } from "@/lib/metrics/team-request";
import { addSheet } from "@/lib/reports/daily-mis";
import { prisma } from "@/lib/prisma";

// The Recovery page's user-wise table as an Excel file: every agent for the current filters and sort (not just the visible page). Same
// numbers as /api/dashboard/users. Admin, Manager and Agency owner only; every export is written to the audit log.
export const GET = async (req: Request) => {
  const parsed = await parseTeamRequest(req);
  if ("error" in parsed) return parsed.error;
  const { user, q, period } = parsed;

  const data = await loadPeriodData(user, q, parsed.range);
  const all = userWiseRows(data.rows).sort((a, b) => (b[q.sort] ?? -1) - (a[q.sort] ?? -1));
  const ids = all.map((r) => r.agentId).filter((id): id is string => !!id);
  const names = new Map((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const sheet = addSheet(
    wb,
    "Recovery",
    ["Agent", "Allocated", "Spoke to", "Not spoken", "Paid", "Part paid", "PTP", "Pending", "Due (₹)", "Collected (₹)", "Pending (₹)", "Collection %"],
    all.map((u) => [
      u.agentId ? (names.get(u.agentId) ?? "Unknown") : "Unassigned",
      u.allocated, u.spoke, u.notSpoke, u.paid, u.partPaid, u.ptp, u.pending, u.dueAmount, u.collected, u.pendingAmount, u.collectionPct ?? "-",
    ]),
  );
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const file = Buffer.from(await wb.xlsx.writeBuffer());
  await logAudit(user.id, "report.export", "report", "recovery", { fy: q.fy, month: q.month, company: q.company ?? null, branch: q.branch ?? null, agentId: q.agentId ?? null, bucket: q.bucket ?? null });

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="recovery-${period.fy}${period.month === "all" ? "" : `-${period.month}`}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
};
