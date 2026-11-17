import { NextResponse } from "next/server";
import { dailyCollection, dpdBreakdown, outcomeBreakdown, summarizeLoans } from "@/lib/metrics/loans";
import { loadPeriodData } from "@/lib/metrics/period";
import { parseTeamRequest } from "@/lib/metrics/team-request";
import { getSetting } from "@/lib/settings";
import type { TeamChartsResponse } from "@/features/dashboard/types";

// Data for the three dashboard charts: money collected per day (with a flat daily target when one is set), loans per latest outcome,
// and cases / due amount per DPD bucket.
export const GET = async (req: Request) => {
  const parsed = await parseTeamRequest(req);
  if ("error" in parsed) return parsed.error;

  const data = await loadPeriodData(parsed.user, parsed.q, parsed.range);
  const daily = dailyCollection(data.payments, data.range);
  const targetPct = await getSetting("dashboard.monthlyTargetPct");
  // Target % of the due amount, spread evenly across the days of the period.
  const dailyTarget = targetPct === null || daily.length === 0 ? null : Math.round(((summarizeLoans(data.rows).dueAmount * targetPct) / 100 / daily.length) * 100) / 100;

  const body: TeamChartsResponse = { period: parsed.period, daily, dailyTarget, outcomes: outcomeBreakdown(data.rows), dpd: dpdBreakdown(data.rows) };
  return NextResponse.json(body);
};
