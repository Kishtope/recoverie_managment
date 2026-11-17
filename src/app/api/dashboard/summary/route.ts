import { NextResponse } from "next/server";
import { loadPeriodData } from "@/lib/metrics/period";
import { summarizeLoans } from "@/lib/metrics/loans";
import { parseTeamRequest } from "@/lib/metrics/team-request";
import { getSetting } from "@/lib/settings";
import type { TeamSummaryResponse } from "@/features/dashboard/types";

// Top cards of the manager / agency owner / admin dashboard for the caller's scope, the chosen financial year / month and the filters.
export const GET = async (req: Request) => {
  const parsed = await parseTeamRequest(req);
  if ("error" in parsed) return parsed.error;

  const data = await loadPeriodData(parsed.user, parsed.q, parsed.range);
  const body: TeamSummaryResponse = {
    period: parsed.period,
    summary: summarizeLoans(data.rows),
    collectedSource: data.collectedSource,
    targetPct: await getSetting("dashboard.monthlyTargetPct"),
  };
  return NextResponse.json(body);
};
