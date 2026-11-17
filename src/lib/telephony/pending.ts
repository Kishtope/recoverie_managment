import type { Prisma } from "@/generated/prisma/client";

// Anything with a `call` delegate: the Prisma client or a transaction client.
type CallDb = { call: Prisma.TransactionClient["call"] };

// Prisma `where` for "this agent's own outbound calls that were answered/missed but have no outcome yet".
export const pendingCallWhere = (agentId: string): Prisma.CallWhereInput => ({
  agentId,
  direction: "OUTBOUND",
  status: { in: ["CONNECTED", "MISSED"] },
  disposition: { is: null },
});

// The agent's oldest call still waiting for an outcome (or null). Pass `loanId` to look only at one case.
// The start route, the disposition route, the banner and the case page all use this, so the rule lives in one place.
export const findPendingCall = (db: CallDb, agentId: string, loanId?: string) =>
  db.call.findFirst({
    where: { ...pendingCallWhere(agentId), ...(loanId ? { loanId } : {}) },
    orderBy: { startedAt: "asc" },
    select: { id: true, loanId: true, status: true, startedAt: true, loan: { select: { customer: { select: { name: true } } } } },
  });
