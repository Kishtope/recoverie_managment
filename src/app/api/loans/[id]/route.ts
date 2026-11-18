import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere } from "@/lib/auth";
import { callingWindowMessage, isWithinCallingWindow } from "@/lib/calling-window";
import { canDecideSettlement, waiverPct } from "@/lib/settlement";
import { recruiterDeadline } from "@/lib/recruiter-deadline";
import { STALE_CALL_HOURS, isWorkerRole } from "@/lib/constants";
import { checkCallRules } from "@/lib/call-rules";
import { countCallsToday } from "@/lib/calls-today";
import { countBrokenPromises, deriveCaseStatus, derivePtpStatus, deriveRiskTag } from "@/lib/case-status";
import { fromDbDate, todayIst } from "@/lib/dates";
import { maskMobile } from "@/lib/mask";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { findPendingCall, pendingCallWhere } from "@/lib/telephony/pending";
import { callItemSelect, toCallItem } from "@/lib/telephony/serialize";
import type { CallBlocked, LoanDetail } from "@/features/cases/types";

// Reads the customer's reference contacts (stored as JSON) into a safe, masked list.
const maskReferences = (value: unknown) =>
  (Array.isArray(value) ? value : []).map((r: { name?: string; relation?: string; mobile?: string }) => ({
    name: String(r?.name ?? ""),
    relation: String(r?.relation ?? ""),
    mobile: maskMobile(r?.mobile),
  }));

// One case with its customer and full outcome history. A case outside the caller's scope is a 404 (not 403) so its existence is not leaked.
export const GET = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT", "RECRUITER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const l = await prisma.loan.findFirst({
    where: { AND: [{ id }, loanScopeWhere(auth.user)] },
    include: {
      customer: true,
      allocations: { where: { active: true }, take: 1, select: { assignedOn: true, agent: { select: { id: true, name: true, role: true } } } },
      dispositions: { orderBy: { createdAt: "desc" }, include: { agent: { select: { id: true, name: true } } } },
      settlements: { orderBy: { createdAt: "desc" }, take: 20 },
      payments: { orderBy: { paidOn: "desc" }, select: { id: true, amount: true, paidOn: true, mode: true, receiptNo: true, source: true } },
    },
  });
  if (!l) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const holder = l.allocations[0]?.agent ?? null;
  const agent = holder ? { id: holder.id, name: holder.name } : null;
  const canAddOutcome = isWorkerRole(auth.user.role) && agent?.id === auth.user.id && l.status === "ACTIVE";

  // Calls on this case (newest first; numbers are already masked). Everyone who can see the case sees its calls.
  const callRows = await prisma.call.findMany({ where: { loanId: id }, select: callItemSelect, orderBy: { startedAt: "desc" }, take: 100 });
  const calls = callRows.map(toCallItem);

  // For the owning agent: the call they are on (ringing) or still owe an outcome for, and why the Call button might be off.
  let currentCall = null;
  let callBlocked: CallBlocked | null = null;
  if (canAddOutcome) {
    const cutoff = new Date(Date.now() - STALE_CALL_HOURS * 3600_000);
    const current = await prisma.call.findFirst({
      where: { loanId: id, agentId: auth.user.id, direction: "OUTBOUND", OR: [{ status: "INITIATED", startedAt: { gte: cutoff } }, pendingCallWhere(auth.user.id)] },
      select: callItemSelect,
      orderBy: { startedAt: "desc" },
    });
    currentCall = current ? toCallItem(current) : null;
    const pending = await findPendingCall(prisma, auth.user.id);
    const window = await getSetting("calling.window");
    const rule = checkCallRules({ disputed: !!l.escalatedAt, doNotCall: l.customer.doNotCall, callsToday: await countCallsToday(id) });
    if (current?.status === "INITIATED") callBlocked = { reason: "CALL_IN_PROGRESS", message: "A call is in progress" };
    else if (rule) callBlocked = { reason: rule.reason, message: rule.message };
    else if (pending) {
      callBlocked = {
        reason: "PENDING_OUTCOME",
        message: pending.loanId === id ? "Record the outcome of your call first" : `Record the outcome of your call with ${pending.loan?.customer.name ?? "the customer"} first`,
        pendingLoanId: pending.loanId ?? undefined,
      };
    } else if (!isWithinCallingWindow(new Date(), window)) callBlocked = { reason: "OUTSIDE_WINDOW", message: callingWindowMessage(window) };
    else if (!l.customer.mobilePrimary && !l.customer.mobileAlt) callBlocked = { reason: "NO_NUMBER", message: "No phone number on file" };
  }
  const today = todayIst();
  // Settlement offers with the names of who asked / decided, and what the signed-in user may do with each.
  const people = await prisma.user.findMany({ where: { id: { in: l.settlements.flatMap((s) => [s.requestedById, s.decidedById ?? ""]).filter(Boolean) } }, select: { id: true, name: true } });
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const managerLimit = await getSetting("settlement.managerLimitPct");
  const settlements = l.settlements.map((s) => {
    const waiver = s.waiverAmount.toNumber();
    const pct = waiverPct(waiver + s.requestedAmount.toNumber(), waiver);
    const pending = s.status === "PENDING";
    return {
      id: s.id, requestedAmount: s.requestedAmount.toNumber(), waiverAmount: waiver, waiverPct: pct, remarks: s.remarks, status: s.status,
      requestedBy: nameOf.get(s.requestedById) ?? null, decidedBy: s.decidedById ? (nameOf.get(s.decidedById) ?? null) : null,
      decidedAt: s.decidedAt?.toISOString() ?? null, decisionNote: s.decisionNote, createdAt: s.createdAt.toISOString(),
      canApprove: pending && canDecideSettlement(auth.user.role, pct, managerLimit),
      canReject: pending && (auth.user.role === "ADMIN" || auth.user.role === "MANAGER"),
    };
  });
  // While a recruiter holds the case: how many days they have left before it escalates (an open promise keeps the timer running).
  const recruiterLimit = holder?.role === "RECRUITER" ? await getSetting("recruiter.escalationDays") : null;
  const promisedFor = l.lastOutcome === "PTP" || l.lastOutcome === "PART_PAID" ? fromDbDate(l.nextFollowUpOn) : null;
  const history = l.dispositions.map((d) => ({ outcome: d.outcome, ptpDate: fromDbDate(d.ptpDate), day: todayIst(d.createdAt) }));
  const paymentDays = l.payments.map((p) => ({ paidOn: fromDbDate(p.paidOn) as string }));
  const loan: LoanDetail = {
    id: l.id,
    agreementNo: l.agreementNo,
    company: l.company,
    branch: l.branch,
    status: l.status,
    disbursedOn: fromDbDate(l.disbursedOn),
    emiAmount: l.emiAmount?.toNumber() ?? null,
    pendingEmis: l.pendingEmis,
    dpd: l.dpd,
    overdueAmount: l.overdueAmount?.toNumber() ?? null,
    nextFollowUpOn: fromDbDate(l.nextFollowUpOn),
    lastOutcome: l.lastOutcome,
    fieldVisitFlag: l.fieldVisitFlag,
    escalatedAt: l.escalatedAt?.toISOString() ?? null,
    caseStatus: deriveCaseStatus({ loanStatus: l.status, allocated: !!agent, lastOutcome: l.lastOutcome, escalatedAt: l.escalatedAt, fieldVisitFlag: l.fieldVisitFlag, notReachableCount: l.notReachableCount }),
    ptpStatus: derivePtpStatus(history, today, paymentDays),
    riskTag: deriveRiskTag(l.dpd, !!l.escalatedAt, countBrokenPromises(history, today, paymentDays)),
    doNotCall: l.customer.doNotCall,
    payments: l.payments.map((p) => ({ id: p.id, amount: p.amount.toNumber(), paidOn: fromDbDate(p.paidOn) as string, mode: p.mode, receiptNo: p.receiptNo, source: p.source === "MANUAL" ? ("MANUAL" as const) : ("IMPORT" as const) })),
    settlements,
    canRecordPayment: l.status === "ACTIVE" && (canAddOutcome || !isWorkerRole(auth.user.role)),
    canRequestSettlement: canAddOutcome && !l.escalatedAt && !settlements.some((s) => s.status === "PENDING"),
    recruiterDeadline: recruiterLimit !== null && l.allocations[0] ? recruiterDeadline(l.allocations[0].assignedOn, recruiterLimit, today, promisedFor) : null,
    canManageCompliance: !isWorkerRole(auth.user.role),
    customer: {
      name: l.customer.name,
      mobilePrimary: maskMobile(l.customer.mobilePrimary),
      mobileAlt: maskMobile(l.customer.mobileAlt),
      references: maskReferences(l.customer.references),
      address: l.customer.address,
      pin: l.customer.pin,
      area: l.customer.area,
    },
    agent,
    canAddOutcome,
    canReassign: !isWorkerRole(auth.user.role) && l.status === "ACTIVE",
    canCall: canAddOutcome && callBlocked === null,
    callBlocked,
    currentCall,
    calls,
    dispositions: l.dispositions.map((d) => ({
      id: d.id,
      outcome: d.outcome,
      ptpDate: fromDbDate(d.ptpDate),
      ptpAmount: d.ptpAmount?.toNumber() ?? null,
      paidAmount: d.paidAmount?.toNumber() ?? null,
      nextFollowUpOn: fromDbDate(d.nextFollowUpOn),
      remarks: d.remarks,
      createdAt: d.createdAt.toISOString(),
      agent: d.agent,
      callId: d.callId,
    })),
  };
  return NextResponse.json({ loan });
};
