import type { Prisma } from "@/generated/prisma/client";
import { todayIst } from "@/lib/dates";
import { notify } from "@/lib/notifications";

// Moves one active case to another agent inside an open transaction: the current allocation is closed (kept as history), a new one is
// opened, and the new holder is notified. Shared by the single and bulk reassign routes so the rules cannot drift apart.
export const moveCase = async (
  tx: Prisma.TransactionClient,
  args: { loanId: string; currentAllocationId: string | null; agent: { id: string; agencyId: string | null }; actedBy: string; now: Date },
) => {
  const { loanId, currentAllocationId, agent, actedBy, now } = args;
  if (currentAllocationId) await tx.allocation.update({ where: { id: currentAllocationId }, data: { active: false, activeLoanId: null, endedAt: now } });
  await tx.allocation.create({ data: { loanId, activeLoanId: loanId, agentId: agent.id, agencyId: agent.agencyId, assignedById: actedBy, assignedOn: now } });
  await notify(tx, [{ userId: agent.id, type: "REASSIGNED", loanId, day: todayIst(now) }]);
};
