import { NextResponse } from "next/server";
import { requireUser, ownCaseWhere } from "@/lib/auth";
import { toDbDate, todayIst } from "@/lib/dates";
import { toDispositionItem } from "@/lib/disposition-item";
import { planDispositionEffects } from "@/lib/dispositions";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { findPendingCall } from "@/lib/telephony/pending";
import { buildDispositionSchema } from "@/features/cases/schemas";
import type { DispositionResult } from "@/features/cases/types";

// Records one interaction on a case: the outcome and the customer's answers to the Admin's questions. Only the agent the case is currently
// allocated to may do this (ownCaseWhere = their active cases); anything else is a 404. The Disposition, its answers and the Loan's follow-up
// state change together in one transaction. Each answer keeps its own copy of the question text, taken here from the database (never from the client).
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["AGENT"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = buildDispositionSchema().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid outcome" }, { status: 400 });
  const { responses, ...v } = parsed.data;

  // How many not-reachable outcomes in a row flag a field visit is an Admin setting.
  const notReachableTries = await getSetting("followUp.notReachableTries");

  const result = await prisma.$transaction(async (tx) => {
    // Re-read inside the transaction so the not-reachable streak is counted from the latest state.
    const loan = await tx.loan.findFirst({
      where: { AND: [{ id }, ownCaseWhere(auth.user.id)] },
      select: { status: true, notReachableCount: true, fieldVisitFlag: true, escalatedAt: true, overdueAmount: true },
    });
    if (!loan) return { status: 404 as const };
    if (loan.status === "CLOSED") return { status: 409 as const };

    // Only questions that are still active can be answered; if Admin changed them while the agent was on the call, ask to reload instead of losing answers silently.
    const questions = responses.length
      ? await tx.customerQuestion.findMany({ where: { id: { in: responses.map((r) => r.questionId) }, active: true }, select: { id: true, text: true, category: true } })
      : [];
    if (questions.length !== responses.length) return { status: 422 as const };
    const questionById = new Map(questions.map((q) => [q.id, q]));

    const next = planDispositionEffects(loan, v, new Date(), notReachableTries);
    const nextDay = next.nextFollowUpOn ? toDbDate(next.nextFollowUpOn) : null;
    // What is still unpaid on a part payment, as it stood when the agent saved it.
    const overdue = loan.overdueAmount?.toNumber() ?? null;
    const remainingAmount = v.outcome === "PART_PAID" && overdue !== null && v.paidAmount !== undefined ? Math.max(overdue - v.paidAmount, 0) : null;
    // The agent's call on this case that still waits for an outcome (if any) gets this outcome, in the same transaction.
    // A call waiting on a different case is left alone. Outcomes with no call (customer walked in) are still allowed.
    const pendingCall = await findPendingCall(tx, auth.user.id, id);
    const disposition = await tx.disposition.create({
      data: {
        loanId: id,
        agentId: auth.user.id,
        callId: pendingCall?.id ?? null,
        outcome: v.outcome,
        outcomeDetail: v.outcomeDetail ?? null,
        ptpDate: v.ptpDate ? toDbDate(v.ptpDate) : null,
        ptpAmount: v.ptpAmount ?? null,
        paidAmount: v.paidAmount ?? null,
        paymentDate: v.paymentDate ? toDbDate(v.paymentDate) : null,
        transactionRef: v.transactionRef ?? null,
        remainingAmount,
        callbackTime: v.callbackTime ?? null,
        reason: v.reason ?? null,
        category: v.category ?? null,
        nextFollowUpOn: nextDay,
        remarks: v.remarks ?? null,
      },
    });
    if (responses.length) {
      await tx.interactionResponse.createMany({
        data: responses.map((r, i) => {
          const q = questionById.get(r.questionId)!;
          return { dispositionId: disposition.id, questionId: q.id, questionText: q.text, category: q.category, response: r.response, remarks: r.remarks ?? null, sortOrder: i };
        }),
      });
    }
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
    return { status: 200 as const, disposition, next, callLinked: !!pendingCall, answers: responses.length };
  });

  if (result.status === 404) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (result.status === 409) return NextResponse.json({ error: "This loan is closed" }, { status: 409 });
  if (result.status === 422) return NextResponse.json({ error: "The questions were changed by an admin. Reload the page and answer again." }, { status: 422 });

  const { disposition: d, next, callLinked, answers } = result;
  const response: DispositionResult = {
    // The row was just written: the answers are summarised by the count, the history refetch loads them with the case.
    disposition: toDispositionItem({ ...d, agent: { id: auth.user.id, name: auth.user.name }, responses: [] }),
    effects: { nextFollowUpOn: next.nextFollowUpOn, fieldVisitFlag: next.fieldVisitFlag, escalated: d.outcome === "REFUSED_DISPUTE", callLinked, answers },
  };
  return NextResponse.json(response, { status: 201 });
};
