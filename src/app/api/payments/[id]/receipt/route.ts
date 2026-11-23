import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere } from "@/lib/auth";
import { fromDbDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import type { Receipt } from "@/features/payments/types";

// The digital receipt for one payment. Only people who can see the payment's case can read it (404 otherwise, so its existence is not leaked).
// Customer contact details are never part of a receipt.
export const GET = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER", "AGENT", "CALLER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const p = await prisma.payment.findFirst({
    where: { id, loan: loanScopeWhere(auth.user) },
    select: {
      amount: true, paidOn: true, mode: true, receiptNo: true, source: true, collectedById: true,
      loan: { select: { agreementNo: true, company: true, branch: true, customer: { select: { name: true } } } },
    },
  });
  if (!p) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const collector = p.collectedById ? await prisma.user.findUnique({ where: { id: p.collectedById }, select: { name: true } }) : null;
  const receipt: Receipt = {
    receiptNo: p.receiptNo,
    amount: p.amount.toNumber(),
    paidOn: fromDbDate(p.paidOn) as string,
    mode: p.mode,
    source: p.source === "MANUAL" ? "MANUAL" : "IMPORT",
    customerName: p.loan.customer.name,
    agreementNo: p.loan.agreementNo,
    company: p.loan.company,
    branch: p.loan.branch,
    collectedBy: collector?.name ?? null,
  };
  return NextResponse.json({ receipt });
};
