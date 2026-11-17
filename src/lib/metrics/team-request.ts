import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import type { CurrentUser } from "@/lib/access";
import { teamQuerySchema, periodOf, type TeamQuery } from "@/features/dashboard/schemas";
import type { TeamPeriod } from "@/features/dashboard/types";
import type { DayRange } from "@/lib/fy";

// Everything the team dashboard routes start with: only Admin, Manager and Agency owner may call them (an agent has their own dashboard),
// the query string is validated, and the month must lie inside the financial year. Returns the user, the query and the day range,
// or an `error` response (401 / 403 / 400) to return as is.
export const parseTeamRequest = async (req: Request): Promise<{ user: CurrentUser; q: TeamQuery; range: DayRange; period: TeamPeriod } | { error: Response }> => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return { error: auth.error as Response };
  const q = teamQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const range = periodOf(q);
  if (!range) return { error: NextResponse.json({ error: "Choose a month inside the selected financial year" }, { status: 400 }) };
  return { user: auth.user, q, range, period: { fy: q.fy, month: q.month, from: range.from, to: range.to } };
};
