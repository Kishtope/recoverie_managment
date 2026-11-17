import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser, callScopeWhere } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { callItemSelect, toCallItem } from "@/lib/telephony/serialize";
import { callsQuerySchema } from "@/features/calls/schemas";
import type { CallListResponse } from "@/features/calls/types";

// Lists calls the caller may see (agent: their own; others: their scope). Filters: status, direction, day (Indian calendar), agent,
// search (customer / agreement), callback=pending (unanswered inbound calls) and, for Admin, unmatched=1 (inbound calls matching no loan).
// Newest first, except the callback queue which lists the oldest first so nobody waits longest.
export const GET = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT"]);
  if ("error" in auth) return auth.error;

  const q = callsQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const from = q.date ? new Date(`${q.date}T00:00:00+05:30`) : null;
  const to = q.date ? new Date(`${addDays(q.date, 1)}T00:00:00+05:30`) : null;

  const where: Prisma.CallWhereInput = {
    AND: [
      callScopeWhere(auth.user),
      q.status ? { status: q.status } : {},
      q.direction ? { direction: q.direction } : {},
      from && to ? { startedAt: { gte: from, lt: to } } : {},
      q.agentId ? { agentId: q.agentId } : {},
      q.callback === "pending" ? { direction: "INBOUND", status: "MISSED", callbackResolvedAt: null } : {},
      // "Unmatched" is an Admin tool; for anyone else the filter is ignored.
      q.unmatched && auth.user.role === "ADMIN" ? { loanId: null } : {},
      q.q ? { OR: [{ loan: { agreementNo: { contains: q.q } } }, { loan: { customer: { name: { contains: q.q } } } }] } : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.call.findMany({
      where,
      select: callItemSelect,
      orderBy: [{ startedAt: q.callback === "pending" ? "asc" : "desc" }, { id: "asc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.call.count({ where }),
  ]);
  const body: CallListResponse = { items: rows.map(toCallItem), total, page: q.page, pageSize: q.pageSize };
  return NextResponse.json(body);
};
