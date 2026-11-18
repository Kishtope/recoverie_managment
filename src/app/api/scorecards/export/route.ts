import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { loadScorecards } from "@/lib/metrics/scorecard";
import { buildScorecardXlsx } from "@/lib/reports/scorecard-xlsx";
import { scorecardQuerySchema } from "@/features/scorecards/schemas";

// The month's caller scorecards as an Excel file. Admin and Manager only (project.md: downloads stay closed to other roles);
// every export is written to the audit log.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;
  const { month } = scorecardQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));

  const data = await loadScorecards(auth.user, month);
  const file = await buildScorecardXlsx(month, data.items);
  await logAudit(auth.user.id, "report.export", "report", "scorecard", { month, callers: data.items.length });

  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="caller-scorecard-${month}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
};
