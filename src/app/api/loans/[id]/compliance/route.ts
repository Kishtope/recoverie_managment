import { NextResponse } from "next/server";
import { requireUser, loanScopeWhere } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { complianceSchema } from "@/features/cases/schemas";

// Compliance controls for a case: lift the dispute pause, or set / clear the customer's do-not-call flag.
// Admin, Manager and Agency owner only, inside their own scope; every change is audited.
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["ADMIN", "MANAGER", "AGENCY_OWNER"]);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = complianceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const loan = await prisma.loan.findFirst({
    where: { AND: [{ id }, loanScopeWhere(auth.user)] },
    select: { customerId: true, escalatedAt: true, customer: { select: { doNotCall: true } } },
  });
  if (!loan) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const { action } = parsed.data;
  if (action === "RESOLVE_DISPUTE") {
    if (!loan.escalatedAt) return NextResponse.json({ error: "This case is not in dispute" }, { status: 409 });
    await prisma.loan.update({ where: { id }, data: { escalatedAt: null } });
  } else {
    const flag = action === "SET_DO_NOT_CALL";
    if (loan.customer.doNotCall === flag) return NextResponse.json({ error: flag ? "Already marked do-not-call" : "Not marked do-not-call" }, { status: 409 });
    await prisma.customer.update({ where: { id: loan.customerId }, data: { doNotCall: flag } });
  }
  await logAudit(auth.user.id, `loan.${action.toLowerCase()}`, "Loan", id);
  return NextResponse.json({ ok: true });
};
