import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere, ownCaseWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isWorkerRole } from "@/lib/constants";
import { fromDbDate, toDbDate, todayIst } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { makeReceiptNo } from "@/lib/receipt";
import { recordPaymentSchema } from "@/features/payments/schemas";
import type { PaymentItem } from "@/features/payments/types";

// Records a payment received on a case and gives it a receipt number. A worker (agent / recruiter) can do this only on a case currently
// allocated to them; Admin, Manager and Agency owner on any case in their scope. The Payments import stays the source of truth for the
// loan's overdue figures, so this does not change them; it makes the money visible at once (case page, promise-kept check, dashboards).
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = recordPaymentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payment" }, { status: 400 });
  const { amount, paidOn, mode, reference } = parsed.data;

  const today = todayIst();
  if (paidOn > today) return NextResponse.json({ error: "The payment date cannot be in the future" }, { status: 400 });

  const scope = isWorkerRole(auth.user.role) ? ownCaseWhere(auth.user.id) : loanScopeWhere(auth.user);
  const loan = await prisma.loan.findFirst({ where: { AND: [{ id }, scope] }, select: { id: true } });
  if (!loan) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const receiptNo = makeReceiptNo(today);
  const payment = await prisma.payment.create({
    data: { loanId: id, amount, paidOn: toDbDate(paidOn), mode: reference ? `${mode} · ${reference}` : mode, receiptNo, source: "MANUAL", collectedById: auth.user.id, dedupeKey: `manual|${receiptNo}` },
    select: { id: true, amount: true, paidOn: true, mode: true, receiptNo: true, source: true },
  });
  await logAudit(auth.user.id, "payment.create", "Payment", payment.id, { loanId: id, amount, mode, receiptNo });

  const item: PaymentItem = { id: payment.id, amount: payment.amount.toNumber(), paidOn: fromDbDate(payment.paidOn) as string, mode: payment.mode, receiptNo: payment.receiptNo, source: "MANUAL" };
  return NextResponse.json({ payment: item }, { status: 201 });
};
