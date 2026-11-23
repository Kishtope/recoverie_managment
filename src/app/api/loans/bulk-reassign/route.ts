import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere, userScopeWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { moveCase } from "@/lib/reassign-case";
import { findPendingCall } from "@/lib/telephony/pending";
import { bulkReassignSchema } from "@/features/cases/schemas";
import type { BulkReassignResult } from "@/features/cases/types";

// Moves several selected cases to one agent. Same rules as the single reassign (caller's scope, active agent, closed loans refused) but a
// case that cannot move is skipped with a reason instead of failing the whole batch.
export const POST = async (req: Request) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return auth.error;

  const parsed = bulkReassignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { loanIds, agentId } = parsed.data;

  const agent = await prisma.user.findFirst({
    where: { AND: [userScopeWhere(auth.user), { id: agentId, status: "ACTIVE", role: { in: ["AGENT", "CALLER", "AGENCY_OWNER"] } }] },
    select: { id: true, name: true, agencyId: true },
  });
  if (!agent) return NextResponse.json({ error: "Choose an agent inside your team" }, { status: 400 });

  const loans = await prisma.loan.findMany({
    where: { AND: [{ id: { in: loanIds } }, loanScopeWhere(auth.user)] },
    select: { id: true, status: true, allocations: { where: { active: true }, take: 1, select: { id: true, agentId: true } } },
  });
  const found = new Map(loans.map((l) => [l.id, l]));

  const skipped: BulkReassignResult["skipped"] = [];
  const movable: { loanId: string; currentAllocationId: string | null }[] = [];
  for (const loanId of loanIds) {
    const loan = found.get(loanId);
    const current = loan?.allocations[0];
    if (!loan) skipped.push({ loanId, reason: "Case not found" });
    else if (loan.status === "CLOSED") skipped.push({ loanId, reason: "Loan is closed" });
    else if (current?.agentId === agent.id) skipped.push({ loanId, reason: `Already allocated to ${agent.name}` });
    else if (current?.agentId && (await findPendingCall(prisma, current.agentId, loanId))) skipped.push({ loanId, reason: "The current agent still has to record a call outcome" });
    else movable.push({ loanId, currentAllocationId: current?.id ?? null });
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const m of movable) await moveCase(tx, { loanId: m.loanId, currentAllocationId: m.currentAllocationId, agent, actedBy: auth.user.id, now });
  });
  if (movable.length) await logAudit(auth.user.id, "loan.bulk_reassign", "Loan", undefined, { to: agent.id, moved: movable.length, loanIds: movable.map((m) => m.loanId) });

  return NextResponse.json({ moved: movable.length, skipped } satisfies BulkReassignResult);
};
