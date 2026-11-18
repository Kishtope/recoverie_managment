import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadScorecards } from "@/lib/metrics/scorecard";
import { scorecardQuerySchema } from "@/features/scorecards/schemas";

// Monthly scorecards for every caller in the user's scope: money collected, recovery %, calls, contact %, promises kept, cases resolved,
// target vs achievement, rank and alerts. Admin, Manager and Agency owner only (an agent sees their own target on their dashboard).
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return auth.error;
  const { month } = scorecardQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return NextResponse.json(await loadScorecards(auth.user, month));
};
