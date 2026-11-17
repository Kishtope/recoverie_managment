import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { devCallToolsEnabled } from "@/lib/telephony";
import { handleCallEvent } from "@/lib/telephony/handle-call-event";
import { simulateInboundSchema } from "@/features/calls/schemas";

// Dev only (Admin): makes a loan's customer "call the company and nobody picked up", to test the callback queue. The number is read
// server-side and matched back to the loan exactly like a real inbound call. 404 unless the mock provider is on and not in production.
export const POST = async (req: Request) => {
  if (!devCallToolsEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const auth = await requireUser(["ADMIN"]);
  if ("error" in auth) return auth.error;

  const parsed = simulateInboundSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const loan = await prisma.loan.findUnique({ where: { id: parsed.data.loanId }, select: { customer: { select: { mobilePrimary: true } } } });
  if (!loan?.customer.mobilePrimary) return NextResponse.json({ error: "Case or customer number not found" }, { status: 404 });

  const { call } = await handleCallEvent({
    providerCallId: `mock_in_${randomUUID()}`,
    direction: "INBOUND",
    status: "MISSED",
    customerNumber: loan.customer.mobilePrimary,
    endedAt: new Date().toISOString(),
  });
  return NextResponse.json({ id: call.id, loanId: call.loanId }, { status: 201 });
};
