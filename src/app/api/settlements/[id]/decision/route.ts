import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { canDecideSettlement, waiverPct } from "@/lib/settlement";
import { decideSettlementSchema } from "@/features/settlements/schemas";

// Approves or rejects a pending settlement. Admin or Manager, for cases in their scope. A Manager may approve only a waiver within the
// Admin's limit (Settings), anything bigger needs an Admin; rejecting is always allowed. Decided once: a second decision is a 409.
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = decideSettlementSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { decision, note } = parsed.data;

  const s = await prisma.settlement.findFirst({
    where: { id, loan: loanScopeWhere(auth.user) },
    select: { status: true, waiverAmount: true, requestedAmount: true, loanId: true },
  });
  if (!s) return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
  if (s.status !== "PENDING") return NextResponse.json({ error: "This request was already decided" }, { status: 409 });

  if (decision === "APPROVED") {
    const waiver = s.waiverAmount.toNumber();
    const pct = waiverPct(waiver + s.requestedAmount.toNumber(), waiver);
    const limit = await getSetting("settlement.managerLimitPct");
    if (!canDecideSettlement(auth.user.role, pct, limit)) {
      return NextResponse.json({ error: `This waives ${pct}% of the overdue amount. Managers can approve up to ${limit}%, so an Admin has to approve it` }, { status: 403 });
    }
  }

  // Conditional update: if two people decide at once only the first one changes the row.
  const done = await prisma.settlement.updateMany({
    where: { id, status: "PENDING" },
    data: { status: decision, decidedById: auth.user.id, decidedAt: new Date(), decisionNote: note || null },
  });
  if (done.count === 0) return NextResponse.json({ error: "This request was already decided" }, { status: 409 });

  await logAudit(auth.user.id, decision === "APPROVED" ? "settlement.approve" : "settlement.reject", "Settlement", id, { loanId: s.loanId });
  return NextResponse.json({ ok: true });
};
