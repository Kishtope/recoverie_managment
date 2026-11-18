import { NextResponse } from "next/server";
import { requireUser, ownCaseWhere } from "@/lib/auth";
import { fromDbDate, toDbDate, todayIst } from "@/lib/dates";
import { planDispositionEffects } from "@/lib/dispositions";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { findPendingCall } from "@/lib/telephony/pending";
import { buildDispositionSchema } from "@/features/cases/schemas";
import type { DispositionResult } from "@/features/cases/types";

// Records an outcome on a case. Only the agent the case is currently allocated to may do this (ownCaseWhere = their active cases);
// anything else is a 404. The Disposition and the Loan's follow-up state change together in one transaction.
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["AGENT", "RECRUITER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = buildDispositionSchema().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid outcome" }, { status: 400 });
  const v = parsed.data;

  // How many not-reachable outcomes in a row flag a field visit is an Admin setting.
  const notReachableTries = await getSetting("followUp.notReachableTries");

  const result = await prisma.$transaction(async (tx) => {
    // Re-read inside the transaction so the not-reachable streak is counted from the latest state.
    const loan = await tx.loan.findFirst({
      where: { AND: [{ id }, ownCaseWhere(auth.user.id)] },
      select: { status: true, notReachableCount: true, fieldVisitFlag: true, escalatedAt: true },
    });
    if (!loan) return { status: 404 as const };
    if (loan.status === "CLOSED") return { status: 409 as const };

    const next = planDispositionEffects(loan, v, new Date(), notReachableTries);
    const nextDay = next.nextFollowUpOn ? toDbDate(next.nextFollowUpOn) : null;
    // The agent's call on this case that still waits for an outcome (if any) gets this outcome, in the same transaction.
    // A call waiting on a different case is left alone. Outcomes with no call (customer walked in) are still allowed.
    const pendingCall = await findPendingCall(tx, auth.user.id, id);
    const disposition = await tx.disposition.create({
      data: {
        loanId: id,
        agentId: auth.user.id,
        callId: pendingCall?.id ?? null,
        outcome: v.outcome,
        ptpDate: v.ptpDate ? toDbDate(v.ptpDate) : null,
        ptpAmount: v.ptpAmount ?? null,
        paidAmount: v.paidAmount ?? null,
        nextFollowUpOn: nextDay,
        remarks: v.remarks ?? null,
      },
    });
    await tx.loan.update({
      where: { id },
      data: {
        lastOutcome: next.lastOutcome,
        lastContactedAt: next.lastContactedAt,
        nextFollowUpOn: nextDay,
        notReachableCount: next.notReachableCount,
        fieldVisitFlag: next.fieldVisitFlag,
        escalatedAt: next.escalatedAt,
      },
    });
    // A refused / disputed case is escalated: the agent's manager (or agency owner) gets a notification, in the same transaction.
    if (v.outcome === "REFUSED_DISPUTE") {
      const boss = await tx.user.findUnique({ where: { id: auth.user.id }, select: { reportsToId: true } });
      if (boss?.reportsToId) await notify(tx, [{ userId: boss.reportsToId, type: "ESCALATION", loanId: id, day: todayIst() }]);
    }
    return { status: 200 as const, disposition, next, callLinked: !!pendingCall };
  });

  if (result.status === 404) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (result.status === 409) return NextResponse.json({ error: "This loan is closed" }, { status: 409 });

  const { disposition: d, next, callLinked } = result;
  const response: DispositionResult = {
    disposition: {
      id: d.id,
      outcome: d.outcome,
      ptpDate: fromDbDate(d.ptpDate),
      ptpAmount: d.ptpAmount?.toNumber() ?? null,
      paidAmount: d.paidAmount?.toNumber() ?? null,
      nextFollowUpOn: fromDbDate(d.nextFollowUpOn),
      remarks: d.remarks,
      createdAt: d.createdAt.toISOString(),
      agent: { id: auth.user.id, name: auth.user.name },
      callId: d.callId,
    },
    effects: { nextFollowUpOn: next.nextFollowUpOn, fieldVisitFlag: next.fieldVisitFlag, escalated: d.outcome === "REFUSED_DISPUTE", callLinked },
  };
  return NextResponse.json(response, { status: 201 });
};
