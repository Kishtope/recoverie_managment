import { NextResponse } from "next/server";
import { loadPerformance } from "@/lib/metrics/performance";
import { parseTeamRequest } from "@/lib/metrics/team-request";
import type { PerformanceResponse } from "@/features/performance/types";

// Team performance for the caller's scope and the chosen financial year / month (and optionally one agent): calls, connected, missed,
// average talk time, promises taken / kept, callback %. Admin, Manager and Agency owner only.
export const GET = async (req: Request) => {
  const parsed = await parseTeamRequest(req);
  if ("error" in parsed) return parsed.error;

  const items = await loadPerformance(parsed.user, parsed.range, parsed.q.agentId);
  const body: PerformanceResponse = { period: parsed.period, items };
  return NextResponse.json(body);
};
