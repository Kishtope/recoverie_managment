import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { callingWindowMessage, isWithinCallingWindow } from "@/lib/calling-window";
import { canDecideSettlement, waiverPct } from "@/lib/settlement";
import { STALE_CALL_HOURS, isWorkerRole } from "@/lib/constants";
import { checkCallRules } from "@/lib/call-rules";
import { countCallsToday } from "@/lib/calls-today";
import { countBrokenPromises, deriveCaseStatus, derivePtpStatus, deriveRiskTag, ptpStatusAt } from "@/lib/case-status";
import { fromDbDate, todayIst } from "@/lib/dates";
import { dispositionInclude, toDispositionItem } from "@/lib/disposition-item";
import { maskMobile } from "@/lib/mask";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { findPendingCall, pendingCallWhere } from "@/lib/telephony/pending";
import { callItemSelect, toCallItem } from "@/lib/telephony/serialize";
import { updateOverdueSchema } from "@/features/cases/schemas";
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
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT", "CALLER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const l = await prisma.loan.findFirst({
    where: { AND: [{ id }, loanScopeWhere(auth.user)] },
    include: {
      customer: { include: { retailer: { select: { id: true, code: true, name: true, city: true, mobile: true } } } },
      allocations: { where: { active: true }, take: 1, select: { assignedOn: true, agent: { select: { id: true, name: true, role: true } } } },
      dispositions: { orderBy: { createdAt: "desc" }, include: dispositionInclude },
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
    notReachableCount: l.notReachableCount,
    retailer: l.customer.retailer,
    payments: l.payments.map((p) => ({ id: p.id, amount: p.amount.toNumber(), paidOn: fromDbDate(p.paidOn) as string, mode: p.mode, receiptNo: p.receiptNo, source: p.source === "MANUAL" ? ("MANUAL" as const) : ("IMPORT" as const) })),
    settlements,
    canRecordPayment: l.status === "ACTIVE" && (canAddOutcome || !isWorkerRole(auth.user.role)),
    canRequestSettlement: canAddOutcome && !l.escalatedAt && !settlements.some((s) => s.status === "PENDING"),
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
    // Each promise carries its own state (pending / kept / broken) so the history shows how every one ended.
    dispositions: l.dispositions.map((d, i) => toDispositionItem(d, d.outcome === "PTP" ? ptpStatusAt(history, i, today, paymentDays) : null)),
  };
  return NextResponse.json({ loan });
};

// Corrects a case's overdue amount. Admin and Manager only, and only for cases in their scope (a case outside it is a 404). The old and new
// amounts are audited because every dashboard "due" figure follows this number.
export const PATCH = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = updateOverdueSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const loan = await prisma.loan.findFirst({ where: { AND: [{ id }, loanScopeWhere(auth.user)] }, select: { status: true, overdueAmount: true } });
  if (!loan) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (loan.status === "CLOSED") return NextResponse.json({ error: "This loan is closed" }, { status: 409 });

  await prisma.loan.update({ where: { id }, data: { overdueAmount: parsed.data.overdueAmount } });
  await logAudit(auth.user.id, "loan.overdue.update", "Loan", id, { from: loan.overdueAmount?.toNumber() ?? null, to: parsed.data.overdueAmount });

  return NextResponse.json({ ok: true, overdueAmount: parsed.data.overdueAmount });
};
