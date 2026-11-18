import type { Prisma } from "@/generated/prisma/client";
import { todayIst } from "@/lib/dates";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

// Moves every active case of a deactivated user to the least-loaded active colleague so no case is left without an owner.
// Colleagues are the active agents / agency owners who report to the same manager (or sit in the same agency); the user's own
// call and disposition history is never touched. Returns how many cases moved and how many had nobody to go to.
export const reassignOpenCases = async (userId: string, actedBy: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { agencyId: true, reportsToId: true } });
  if (!user) return { moved: 0, stranded: 0 };

  const peerScope: Prisma.UserWhereInput[] = [];
  if (user.reportsToId) peerScope.push({ reportsToId: user.reportsToId });
  if (user.agencyId) peerScope.push({ agencyId: user.agencyId });

  const [open, peers] = await Promise.all([
    prisma.allocation.findMany({ where: { agentId: userId, active: true, loan: { status: "ACTIVE" } }, select: { id: true, loanId: true } }),
    peerScope.length
      ? prisma.user.findMany({
          where: { id: { not: userId }, status: "ACTIVE", role: { in: ["AGENT", "AGENCY_OWNER"] }, OR: peerScope },
          select: { id: true, agencyId: true, _count: { select: { allocations: { where: { active: true } } } } },
        })
      : Promise.resolve([]),
  ]);
  if (!open.length) return { moved: 0, stranded: 0 };
  if (!peers.length) return { moved: 0, stranded: open.length };

  // Running load per colleague so cases spread evenly instead of all landing on the first one.
  const load = new Map(peers.map((p) => [p.id, p._count.allocations]));
  const byId = new Map(peers.map((p) => [p.id, p]));
  const now = new Date();
  const day = todayIst(now);

  await prisma.$transaction(async (tx) => {
    for (const a of open) {
      const [targetId] = [...load.entries()].sort((x, y) => x[1] - y[1])[0];
      load.set(targetId, (load.get(targetId) ?? 0) + 1);
      await tx.allocation.update({ where: { id: a.id }, data: { active: false, activeLoanId: null, endedAt: now } });
      await tx.allocation.create({
        data: { loanId: a.loanId, activeLoanId: a.loanId, agentId: targetId, agencyId: byId.get(targetId)?.agencyId ?? null, assignedById: actedBy, assignedOn: now },
      });
      await notify(tx, [{ userId: targetId, type: "REASSIGNED", loanId: a.loanId, day }]);
    }
  });
  return { moved: open.length, stranded: 0 };
};
