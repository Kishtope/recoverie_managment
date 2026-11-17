import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere } from "@/lib/auth";
import { callingWindowMessage, isWithinCallingWindow } from "@/lib/calling-window";
import { STALE_CALL_HOURS } from "@/lib/constants";
import { fromDbDate } from "@/lib/dates";
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
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const l = await prisma.loan.findFirst({
    where: { AND: [{ id }, loanScopeWhere(auth.user)] },
    include: {
      customer: true,
      allocations: { where: { active: true }, take: 1, select: { agent: { select: { id: true, name: true } } } },
      dispositions: { orderBy: { createdAt: "desc" }, include: { agent: { select: { id: true, name: true } } } },
    },
  });
  if (!l) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const agent = l.allocations[0]?.agent ?? null;
  const canAddOutcome = auth.user.role === "AGENT" && agent?.id === auth.user.id && l.status === "ACTIVE";

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
    if (current?.status === "INITIATED") callBlocked = { reason: "CALL_IN_PROGRESS", message: "A call is in progress" };
    else if (pending) {
      callBlocked = {
        reason: "PENDING_OUTCOME",
        message: pending.loanId === id ? "Record the outcome of your call first" : `Record the outcome of your call with ${pending.loan?.customer.name ?? "the customer"} first`,
        pendingLoanId: pending.loanId ?? undefined,
      };
    } else if (!isWithinCallingWindow(new Date(), window)) callBlocked = { reason: "OUTSIDE_WINDOW", message: callingWindowMessage(window) };
    else if (!l.customer.mobilePrimary && !l.customer.mobileAlt) callBlocked = { reason: "NO_NUMBER", message: "No phone number on file" };
  }
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
    canReassign: auth.user.role !== "AGENT" && l.status === "ACTIVE",
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
