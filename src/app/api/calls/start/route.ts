import { NextResponse } from "next/server";
import { requireUser, ownCaseWhere } from "@/lib/auth";
import { callingWindowMessage, isWithinCallingWindow } from "@/lib/calling-window";
import { checkCallRules } from "@/lib/call-rules";
import { countCallsToday } from "@/lib/calls-today";
import { maskMobile } from "@/lib/mask";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { devCallToolsEnabled, getTelephonyProvider } from "@/lib/telephony";
import { findPendingCall } from "@/lib/telephony/pending";
import { callItemSelect, toCallItem } from "@/lib/telephony/serialize";
import { startCallSchema } from "@/features/calls/schemas";

// Places a call from the agent to a customer through the telephony provider. Order of checks: window (403) -> case in scope (404) /
// closed (409) -> agent has no call waiting for an outcome (409) -> agent mobile (400) -> create the Call -> ask the provider.
// The customer's real number is read from the DB here and goes only to the provider; the browser sends just "primary" or "alt".
export const POST = async (req: Request) => {
  const auth = await requireUser(["AGENT", "RECRUITER"]);
  if ("error" in auth) return auth.error;

  const parsed = startCallSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { loanId, numberSlot } = parsed.data;

  // The window is an Admin setting (default 9 AM-7 PM IST).
  const window = await getSetting("calling.window");
  if (!isWithinCallingWindow(new Date(), window)) return NextResponse.json({ error: callingWindowMessage(window) }, { status: 403 });

  const loan = await prisma.loan.findFirst({
    where: { AND: [{ id: loanId }, ownCaseWhere(auth.user.id)] },
    select: { status: true, escalatedAt: true, customer: { select: { mobilePrimary: true, mobileAlt: true, doNotCall: true } } },
  });
  if (!loan) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (loan.status === "CLOSED") return NextResponse.json({ error: "This loan is closed" }, { status: 409 });

  // Compliance: dispute pause, do-not-call and the per-customer daily cap.
  const blocked = checkCallRules({ disputed: !!loan.escalatedAt, doNotCall: loan.customer.doNotCall, callsToday: await countCallsToday(loanId) });
  if (blocked) return NextResponse.json({ error: blocked.message, reason: blocked.reason }, { status: blocked.status });

  const pending = await findPendingCall(prisma, auth.user.id);
  if (pending) {
    return NextResponse.json(
      { error: `Record the outcome of your call with ${pending.loan?.customer.name ?? "the customer"} first`, loanId: pending.loanId },
      { status: 409 },
    );
  }

  // TODO(sarv): Sarv may want an extension or agent id instead of the agent's mobile (then User needs a new field).
  const agent = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { mobile: true } });
  if (!agent?.mobile) return NextResponse.json({ error: "Add your mobile on the Team page first" }, { status: 400 });

  const customerNumber = numberSlot === "primary" ? loan.customer.mobilePrimary : loan.customer.mobileAlt;
  if (!customerNumber) return NextResponse.json({ error: "This customer has no such number on file" }, { status: 400 });

  const provider = getTelephonyProvider();
  const created = await prisma.call.create({
    data: {
      provider: provider.name,
      direction: "OUTBOUND",
      loanId,
      agentId: auth.user.id,
      numberSlot,
      customerNumberMask: maskMobile(customerNumber),
    },
    select: { id: true },
  });

  try {
    const { providerCallId } = await provider.startCall({ callId: created.id, agentNumber: agent.mobile, customerNumber });
    // The webhook may already have filled the row by our call id; this only makes sure the provider id is stored.
    const call = await prisma.call.update({ where: { id: created.id }, data: { providerCallId }, select: callItemSelect });
    // Calling the customer back answers any of their missed calls on this case.
    await prisma.call.updateMany({
      where: { loanId, direction: "INBOUND", status: "MISSED", callbackResolvedAt: null },
      data: { callbackResolvedAt: new Date() },
    });
    return NextResponse.json({ call: toCallItem(call), canSimulate: devCallToolsEnabled() }, { status: 201 });
  } catch (error) {
    console.error("Telephony startCall failed", error);
    await prisma.call.update({ where: { id: created.id }, data: { status: "FAILED", failureReason: "Provider error", endedAt: new Date() } });
    return NextResponse.json({ error: "Couldn't place the call" }, { status: 502 });
  }
};
