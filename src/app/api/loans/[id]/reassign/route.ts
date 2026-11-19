import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere, userScopeWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { moveCase } from "@/lib/reassign-case";
import { findPendingCall } from "@/lib/telephony/pending";
import { reassignSchema } from "@/features/cases/schemas";

// Moves an active case to another agent. Admin: anyone; Manager: cases and agents in their team / branches; Agency owner: their agency.
// The old allocation is closed (kept as history) and a new one opened in one transaction; the new agent gets a notification and the move
// is audited. Refused when the current agent still owes an outcome for a call on this case, because once the case moves they could no
// longer record it.
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = reassignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const loan = await prisma.loan.findFirst({
    where: { AND: [{ id }, loanScopeWhere(auth.user)] },
    select: { status: true, allocations: { where: { active: true }, take: 1, select: { id: true, agentId: true } } },
  });
  if (!loan) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (loan.status === "CLOSED") return NextResponse.json({ error: "This loan is closed" }, { status: 409 });

  // The new holder must be an active agent (or agency owner) inside the caller's own user scope.
  const agent = await prisma.user.findFirst({
    where: { AND: [userScopeWhere(auth.user), { id: parsed.data.agentId, status: "ACTIVE", role: { in: ["AGENT", "AGENCY_OWNER"] } }] },
    select: { id: true, name: true, agencyId: true },
  });
  if (!agent) return NextResponse.json({ error: "Choose an agent inside your team" }, { status: 400 });

  const current = loan.allocations[0];
  if (current?.agentId === agent.id) return NextResponse.json({ error: `Already allocated to ${agent.name}` }, { status: 409 });
  if (current?.agentId && (await findPendingCall(prisma, current.agentId, id))) {
    return NextResponse.json({ error: "The current agent still has to record the outcome of a call on this case" }, { status: 409 });
  }

  const now = new Date();
  await prisma.$transaction((tx) => moveCase(tx, { loanId: id, currentAllocationId: current?.id ?? null, agent, actedBy: auth.user.id, now }));
  await logAudit(auth.user.id, "loan.reassign", "Loan", id, { from: current?.agentId ?? null, to: agent.id });

  return NextResponse.json({ ok: true, agent: { id: agent.id, name: agent.name } });
};
