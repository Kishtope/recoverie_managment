import { NextResponse } from "next/server";
import { requireUser, ownCaseWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { settlementOfferError, waiverFor } from "@/lib/settlement";
import { requestSettlementSchema } from "@/features/settlements/schemas";

// An agent or recruiter asks for a one-time settlement on a case allocated to them: the customer pays `requestedAmount`, the rest of the
// overdue is waived. One open request per case at a time. A Manager or Admin decides it (see /api/settlements/[id]/decision).
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["AGENT", "RECRUITER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = requestSettlementSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { requestedAmount, remarks } = parsed.data;

  const loan = await prisma.loan.findFirst({
    where: { AND: [{ id }, ownCaseWhere(auth.user.id)] },
    select: { status: true, overdueAmount: true, escalatedAt: true, settlements: { where: { status: "PENDING" }, select: { id: true }, take: 1 } },
  });
  if (!loan) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (loan.status === "CLOSED") return NextResponse.json({ error: "This loan is closed" }, { status: 409 });
  if (loan.escalatedAt) return NextResponse.json({ error: "This case is in dispute. Settlements are paused until a manager resolves it" }, { status: 409 });
  if (loan.settlements.length) return NextResponse.json({ error: "A settlement request is already waiting for a decision" }, { status: 409 });

  const overdue = loan.overdueAmount?.toNumber() ?? null;
  const offerError = settlementOfferError(overdue, requestedAmount);
  if (offerError) return NextResponse.json({ error: offerError }, { status: 400 });

  const settlement = await prisma.settlement.create({
    data: { loanId: id, requestedById: auth.user.id, requestedAmount, waiverAmount: waiverFor(overdue as number, requestedAmount), remarks: remarks || null },
    select: { id: true },
  });
  await logAudit(auth.user.id, "settlement.request", "Settlement", settlement.id, { loanId: id, requestedAmount, overdue });
  return NextResponse.json({ id: settlement.id }, { status: 201 });
};
